import type { AnyCompositeDefinition, CoreProgramOutput } from '@retikz/core';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
  RuntimeError,
} from '@retikz/runtime';

import type {
  VanillaCompileDriver,
  VanillaCompileDriverInput,
  VanillaCompileDriverSession,
} from '../../runtime/compile-driver';
import type {
  PreparedProcessingInput,
  ProcessingController,
  ProcessingOptions,
  ProcessingResult,
  ProcessingSource,
} from '../types';
import type { InternalProcessingController, ProcessingTransactionParticipantFactory } from './types';

import {
  commitVanillaCompileOutput,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
  resolveVanillaCompileOutput,
} from '../../runtime/compile-driver';
import { createRetainedCompositeDefinitions, VanillaCompositeRevisionOwnerDefinition } from '../composites';
import { prepareProcessingInput } from '../prepare';

/** 自定义编译驱动下一 revision 的领域中立失效标识 */
const VanillaCompileDriverRevisionOwnerDefinition = defineRuntimeOwner<number, number, number, never>({
  key: '@retikz/vanilla:compile-driver-revision',
  value: {
    capture: value => {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error('Vanilla compile driver revision must be a non-negative safe integer');
      }
      return value;
    },
    read: value => value,
    equals: Object.is,
  },
});

/** 根 processing result participant 的稳定 Runtime key */
const PROCESSING_RESULT_PARTICIPANT_KEY = '@retikz/vanilla:processing-result' as const;

/** 返回 Runtime 包装错误中最接近 Core 编译诊断的根因 */
const processingCause = (cause: unknown): unknown => {
  let current = cause;
  while (current instanceof RuntimeError && current.cause !== undefined) current = current.cause;
  return current;
};

/** 复制 retained 生命周期内继续读取的处理配置 */
const captureProcessingOptions = (options: ProcessingOptions): ProcessingOptions => {
  const composites = options.compile?.composites;
  return Object.freeze({
    ...options,
    ...(options.compile === undefined
      ? {}
      : {
          compile: Object.freeze({
            ...options.compile,
            ...(composites === undefined ? {} : { composites: Object.freeze([...composites]) }),
          }),
        }),
    ...(options.adapters === undefined ? {} : { adapters: Object.freeze([...options.adapters]) }),
  });
};

/** 恢复 compile driver 的上一份输入，并保持 retained session identity */
const restoreVanillaCompileDriverSession = (
  compileDriver: VanillaCompileDriver,
  input: VanillaCompileDriverInput,
  compileSession: VanillaCompileDriverSession,
): void => {
  const restored = createVanillaCompileDriverSession(compileDriver, input);
  if (restored !== compileSession) throw new Error('Vanilla compile driver restore changed session identity');
};

/** 以同一 Runtime revision 冻结全部 processing 公共结果 */
const createProcessingResult = (
  revision: number,
  prepared: PreparedProcessingInput,
  output: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>,
  compileSession: VanillaCompileDriverSession,
): ProcessingResult => {
  const resolved = resolveVanillaCompileOutput(compileSession, output);
  return Object.freeze({
    revision,
    scene: output.result.scene,
    compileResult: output.result,
    artifacts: Object.freeze([...output.result.artifacts]),
    layers: Object.freeze([...resolved.layers]),
    diagnostics: Object.freeze([...resolved.diagnostics]),
    runtimeMeta: prepared.runtimeMeta,
  });
};

/** 单条 Runtime session 持有的 Core Program、Definitions 与 committed processing result */
type RetainedProcessingState = Readonly<{
  /** 当前 Program 可接受的 definition topology */
  compositeDefinitions: ReturnType<typeof createRetainedCompositeDefinitions>;
  /** 当前编译驱动输入，用于失败后恢复驱动状态 */
  driverInput: () => VanillaCompileDriverInput;
  /** 读取该 session 的已提交结果 */
  read: () => ProcessingResult;
  /** 在固定 topology 内更新 source */
  update: (
    next: PreparedProcessingInput,
    nextDriverInput: VanillaCompileDriverInput,
    revision: number,
  ) => ProcessingResult;
  /** 仅更新固定 participant 的配置 */
  updateParticipant: (revision: number) => ProcessingResult;
  /** 提交当前已准备 Core 输出的 compile driver 通知 */
  commitDriver: () => void;
  /** 读取并清空当前 Runtime session 的诊断 */
  diagnostics: () => ReadonlyArray<unknown>;
  /** 释放当前 Runtime session */
  dispose: () => void;
}>;

/** 创建一个与固定 Composite topology 绑定的 retained processing state */
const createRetainedProcessingState = (
  initial: PreparedProcessingInput,
  initialDriverInput: VanillaCompileDriverInput,
  initialRevision: number,
  fixedOptions: ProcessingOptions,
  compileDriver: NonNullable<ProcessingOptions['compileDriver']>,
  hasCustomCompileDriver: boolean,
  compileSession: VanillaCompileDriverSession,
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
): RetainedProcessingState => {
  const compositeDefinitions = createRetainedCompositeDefinitions(initial.coreOptions.composites);
  let driverInput = initialDriverInput;
  const coreProgram = createCoreProgram(
    { ...initial.coreOptions, composites: compositeDefinitions.definitions },
    {
      invalidationOwners: [
        VanillaCompositeRevisionOwnerDefinition,
        ...(hasCustomCompileDriver ? [VanillaCompileDriverRevisionOwnerDefinition] : []),
      ],
      observers: compileSession.observers,
    },
  );
  const resolveReadonlyLayers = (output: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>) =>
    resolveVanillaCompileOutput(compileSession, output).layers;
  const transactionParticipant = transactionParticipantFactory?.({
    initial,
    coreProgram,
    resolveReadonlyLayers,
  });
  const owners = createRuntimeOwnerRegistry({
    builtins: [
      CoreOwnerDefinition,
      VanillaCompositeRevisionOwnerDefinition,
      VanillaCompileDriverRevisionOwnerDefinition,
      ...(transactionParticipant?.owners ?? []),
    ],
  });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
  let participantResult: ProcessingResult | undefined;
  let participantPrepared = initial;
  let participantRevision = initialRevision;
  const resultParticipant = defineRuntimeCommitParticipant<ProcessingResult>({
    key: PROCESSING_RESULT_PARTICIPANT_KEY,
    owners: [],
    programs: [coreProgram],
    revisionPolicy: 'continuous',
    tracePhases: [],
    prepare: candidate => {
      const output = candidate.artifact(coreProgram).value.output;
      const next = createProcessingResult(participantRevision, participantPrepared, output, compileSession);
      const previous = participantResult;
      return Object.freeze({
        commit: () => {
          participantResult = next;
        },
        rollback: () => {
          participantResult = previous;
        },
        dispose: () => undefined,
      });
    },
    read: () => {
      if (participantResult === undefined) throw new Error('Vanilla processing result is unavailable');
      return participantResult;
    },
    dispose: () => {
      participantResult = undefined;
    },
  });
  let session: ReturnType<typeof createRuntimeSession>;
  try {
    session = createRuntimeSession({
      owners,
      programs,
      updateStrategy: fixedOptions.updateStrategy,
      participants: [
        resultParticipant,
        ...(transactionParticipant === undefined ? [] : [transactionParticipant.participant]),
      ],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, initial.source),
        createRuntimeOwnerInput(VanillaCompositeRevisionOwnerDefinition, 0),
        createRuntimeOwnerInput(VanillaCompileDriverRevisionOwnerDefinition, 0),
        ...(transactionParticipant?.initialSnapshots ?? []),
      ],
    });
  } catch (cause) {
    throw processingCause(cause);
  }
  transactionParticipant?.connect?.(session);
  let prepared = initial;
  let compositeRevision = 0;
  let compileDriverRevision = 0;
  let current = session.participant(resultParticipant);

  /** 在本 session 的当前 Core 输出上提交 compile driver 通知 */
  const commitDriver = (): void => {
    commitVanillaCompileOutput(
      compileSession,
      resolveVanillaCompileOutput(compileSession, session.artifact(coreProgram).value.output),
    );
  };

  return Object.freeze({
    compositeDefinitions,
    driverInput: () => driverInput,
    read: () => current,
    update: (next, nextDriverInput, revision) => {
      const definitions = compositeDefinitions.prepare(next.coreOptions.composites);
      const previousDriverInput = driverInput;
      try {
        const nextCompileSession = createVanillaCompileDriverSession(compileDriver, nextDriverInput);
        if (nextCompileSession !== compileSession) {
          throw new Error('Vanilla compile driver must preserve its session for a retained processing controller');
        }
        const nextCompositeRevision = definitions.changed ? compositeRevision + 1 : compositeRevision;
        const nextCompileDriverRevision = hasCustomCompileDriver ? compileDriverRevision + 1 : compileDriverRevision;
        participantPrepared = next;
        participantRevision = revision;
        session.update({
          baseRevision: session.revision(),
          owners: [
            createRuntimeOwnerUpdate(CoreOwnerDefinition, next.source),
            ...(definitions.changed
              ? [createRuntimeOwnerUpdate(VanillaCompositeRevisionOwnerDefinition, nextCompositeRevision)]
              : []),
            ...(hasCustomCompileDriver
              ? [createRuntimeOwnerUpdate(VanillaCompileDriverRevisionOwnerDefinition, nextCompileDriverRevision)]
              : []),
            ...(transactionParticipant?.update({ prepared: next, revision, kind: 'source' }) ?? []),
          ],
        });
        definitions.commit();
        compositeRevision = nextCompositeRevision;
        compileDriverRevision = nextCompileDriverRevision;
        driverInput = nextDriverInput;
        prepared = next;
        current = session.participant(resultParticipant);
        commitDriver();
        return current;
      } catch (cause) {
        participantPrepared = prepared;
        participantRevision = current.revision;
        definitions.rollback();
        try {
          restoreVanillaCompileDriverSession(compileDriver, previousDriverInput, compileSession);
        } catch (restoreCause) {
          throw new Error('Vanilla compile driver input rollback failed', { cause: restoreCause });
        }
        throw cause;
      }
    },
    updateParticipant: revision => {
      if (transactionParticipant?.updateParticipant === undefined) {
        throw new Error('createProcessingController: participant configuration is unavailable');
      }
      participantPrepared = prepared;
      participantRevision = revision;
      try {
        session.update({
          baseRevision: session.revision(),
          owners: transactionParticipant.updateParticipant(revision),
        });
        current = session.participant(resultParticipant);
        commitDriver();
        return current;
      } catch (cause) {
        participantRevision = current.revision;
        throw cause;
      }
    },
    commitDriver,
    diagnostics: session.diagnostics,
    dispose: () => session.dispose(),
  });
};

/** 创建带可选固定内部 participant 的 processing controller */
const createProcessingController = (
  source: ProcessingSource,
  options: ProcessingOptions = {},
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
): ProcessingController => {
  const fixedOptions = captureProcessingOptions(options);
  const initial = prepareProcessingInput(source, fixedOptions);
  const compileDriver = fixedOptions.compileDriver ?? defaultVanillaCompileDriver;
  const hasCustomCompileDriver = fixedOptions.compileDriver !== undefined;
  const instance = Object.freeze({});
  const driverInput = (prepared: PreparedProcessingInput): VanillaCompileDriverInput =>
    Object.freeze({
      instance,
      source: prepared.source,
      authoringSites: prepared.authoringSites,
      coreOptions: prepared.coreOptions,
    });
  const initialDriverInput = driverInput(initial);
  const compileSession = createVanillaCompileDriverSession(compileDriver, initialDriverInput);
  const createState = (
    prepared: PreparedProcessingInput,
    input: VanillaCompileDriverInput,
    revision: number,
    participantFactory?: ProcessingTransactionParticipantFactory,
  ): RetainedProcessingState =>
    createRetainedProcessingState(
      prepared,
      input,
      revision,
      fixedOptions,
      compileDriver,
      hasCustomCompileDriver,
      compileSession,
      participantFactory,
    );
  let state = createState(initial, initialDriverInput, 0, transactionParticipantFactory);
  let current = state.read();
  state.commitDriver();
  let disposed = false;
  const listeners = new Set<(result: ProcessingResult) => void>();
  const diagnostics: Array<unknown> = [];

  /** 发布已提交结果，隔离订阅方异常以免破坏已完成的 Runtime transaction */
  const notifyListeners = (result: ProcessingResult): void => {
    for (const listener of listeners) {
      try {
        listener(result);
      } catch (cause) {
        diagnostics.push(cause);
      }
    }
  };

  const assertActive = (): void => {
    if (disposed) throw new Error('Processing controller is disposed');
  };

  return Object.freeze({
    update: nextSource => {
      assertActive();
      let next: PreparedProcessingInput;
      try {
        next = prepareProcessingInput(nextSource, fixedOptions);
      } catch (cause) {
        diagnostics.push(cause);
        throw cause;
      }
      const nextDriverInput = driverInput(next);
      if (!state.compositeDefinitions.isCompatible(next.coreOptions.composites)) {
        const previous = state;
        let candidate: RetainedProcessingState;
        try {
          const candidateCompileSession = createVanillaCompileDriverSession(compileDriver, nextDriverInput);
          if (candidateCompileSession !== compileSession) {
            throw new Error('Vanilla compile driver must preserve its session for a retained processing controller');
          }
          candidate = createState(next, nextDriverInput, current.revision + 1, transactionParticipantFactory);
        } catch (cause) {
          try {
            restoreVanillaCompileDriverSession(compileDriver, previous.driverInput(), compileSession);
          } catch (restoreCause) {
            const rollbackCause = new Error('Vanilla compile driver input rollback failed', { cause: restoreCause });
            diagnostics.push(rollbackCause);
            throw rollbackCause;
          }
          diagnostics.push(cause);
          throw cause;
        }
        previous.dispose();
        state = candidate;
        current = state.read();
        state.commitDriver();
        notifyListeners(current);
        return;
      }
      try {
        current = state.update(next, nextDriverInput, current.revision + 1);
        notifyListeners(current);
      } catch (cause) {
        diagnostics.push(cause);
        throw cause;
      }
    },
    read: () => current,
    subscribe: listener => {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    diagnostics: () => {
      const result = Object.freeze([...diagnostics, ...state.diagnostics()]);
      diagnostics.length = 0;
      return result;
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
      state.dispose();
    },
    updateParticipant: () => {
      assertActive();
      try {
        current = state.updateParticipant(current.revision + 1);
        notifyListeners(current);
      } catch (cause) {
        diagnostics.push(cause);
        throw cause;
      }
    },
  });
};

/** 创建带固定 DOM participant 的 processing controller */
export const createDomProcessingController = (
  source: ProcessingSource,
  options: ProcessingOptions = {},
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
): InternalProcessingController =>
  createProcessingController(source, options, transactionParticipantFactory) as InternalProcessingController;
