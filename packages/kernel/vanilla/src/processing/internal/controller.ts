import type { AnyCompositeDefinition, CoreComputationOutput } from '@retikz/core';
import { CoreSourceDefinition, CoreCompositeInputSourceDefinition, createCoreComputation } from '@retikz/core';
import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeSourceUpdate,
  createRuntimeComputationRegistry,
  createRuntime,
  defineRuntimeCommitParticipant,
  defineRuntimeSource,
  RetikzRuntimeError,
} from '@retikz/runtime';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type {
  VanillaCompileDriver,
  VanillaCompileDriverInput,
  VanillaCompileDriverSession,
} from '../../runtime/compile-driver';
import {
  commitVanillaCompileOutput,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
  resolveVanillaCompileOutput,
} from '../../runtime/compile-driver';
import { createRetainedCompositeDefinitions, VanillaCompositeRevisionSourceDefinition } from '../composites';
import { prepareProcessingInput } from '../prepare';
import type { PreparedProcessingInput, ProcessingOptions, ProcessingResult, ProcessingSource } from '../types';
import type {
  InternalProcessingController,
  ProcessingTransactionParticipantFactory,
  PreparedInputProcessingController,
} from './types';

/** 自定义编译驱动下一 revision 的领域中立失效标识 */
const VanillaCompileDriverRevisionSourceDefinition = defineRuntimeSource<number, number, number, never>({
  key: '@retikz/vanilla:compile-driver-revision',
  value: {
    capture: value => {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Processing,
          'Vanilla compile driver revision must be a non-negative safe integer',
        );
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
  while (current instanceof RetikzRuntimeError && current.cause !== undefined) current = current.cause;
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
  if (restored !== compileSession)
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Processing,
      'Vanilla compile driver restore changed session identity',
    );
};

/** 以同一 Runtime revision 冻结全部 processing 公共结果 */
const createProcessingResult = (
  revision: number,
  prepared: PreparedProcessingInput,
  output: CoreComputationOutput<ReadonlyArray<AnyCompositeDefinition>>,
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

/** 单条 Runtime 持有的 Core Computation、Definitions 与 committed processing result */
type RetainedProcessingState = Readonly<{
  /** 当前 Computation 可接受的 definition topology */
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
  /** 读取并清空当前 Runtime 的诊断 */
  diagnostics: () => ReadonlyArray<unknown>;
  /** 释放当前 Runtime */
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
  assertCurrent: () => void,
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
): RetainedProcessingState => {
  const compositeDefinitions = createRetainedCompositeDefinitions(initial.coreOptions.composites);
  let driverInput = initialDriverInput;
  const coreComputation = createCoreComputation(
    { ...initial.coreOptions, compositeInputs: undefined, composites: compositeDefinitions.definitions },
    {
      compositeInputSource: CoreCompositeInputSourceDefinition,
      invalidationSources: [
        VanillaCompositeRevisionSourceDefinition,
        ...(hasCustomCompileDriver ? [VanillaCompileDriverRevisionSourceDefinition] : []),
      ],
      observers: compileSession.observers,
    },
  );
  const resolveReadonlyLayers = (output: CoreComputationOutput<ReadonlyArray<AnyCompositeDefinition>>) =>
    resolveVanillaCompileOutput(compileSession, output).layers;
  const transactionParticipant = transactionParticipantFactory?.({
    initial,
    coreComputation,
    resolveReadonlyLayers,
  });
  const sources = createRuntimeSourceRegistry({
    builtins: [
      CoreSourceDefinition,
      CoreCompositeInputSourceDefinition,
      VanillaCompositeRevisionSourceDefinition,
      VanillaCompileDriverRevisionSourceDefinition,
      ...(transactionParticipant?.sources ?? []),
    ],
  });
  const computations = createRuntimeComputationRegistry({ sources, builtins: [coreComputation] });
  let participantResult: ProcessingResult | undefined;
  let participantPrepared = initial;
  let participantRevision = initialRevision;
  const resultParticipant = defineRuntimeCommitParticipant<ProcessingResult>({
    key: PROCESSING_RESULT_PARTICIPANT_KEY,
    sources: [],
    computations: [coreComputation],
    revisionPolicy: 'continuous',
    tracePhases: [],
    prepare: candidate => {
      const output = candidate.artifact(coreComputation).value.output;
      const next = createProcessingResult(participantRevision, participantPrepared, output, compileSession);
      assertCurrent();
      const previous = participantResult;
      return Object.freeze({
        commit: () => {
          assertCurrent();
          participantResult = next;
        },
        rollback: () => {
          participantResult = previous;
        },
        dispose: () => undefined,
      });
    },
    read: () => {
      if (participantResult === undefined)
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Vanilla processing result is unavailable');
      return participantResult;
    },
    dispose: () => {
      participantResult = undefined;
    },
  });
  let runtime: ReturnType<typeof createRuntime>;
  try {
    runtime = createRuntime({
      sources,
      computations,
      updateStrategy: fixedOptions.updateStrategy,
      participants: [
        resultParticipant,
        ...(transactionParticipant === undefined ? [] : [transactionParticipant.participant]),
      ],
      initialSnapshots: [
        createRuntimeSourceInput(CoreSourceDefinition, initial.source),
        createRuntimeSourceInput(CoreCompositeInputSourceDefinition, initial.coreOptions.compositeInputs),
        createRuntimeSourceInput(VanillaCompositeRevisionSourceDefinition, 0),
        createRuntimeSourceInput(VanillaCompileDriverRevisionSourceDefinition, 0),
        ...(transactionParticipant?.initialSnapshots ?? []),
      ],
    });
  } catch (cause) {
    throw processingCause(cause);
  }
  transactionParticipant?.connect?.(runtime);
  let prepared = initial;
  let compositeRevision = 0;
  let compileDriverRevision = 0;
  let current = runtime.participant(resultParticipant);

  /** 在本 session 的当前 Core 输出上提交 compile driver 通知 */
  const commitDriver = (): void => {
    commitVanillaCompileOutput(
      compileSession,
      resolveVanillaCompileOutput(compileSession, runtime.artifact(coreComputation).value.output),
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
        assertCurrent();
        if (nextCompileSession !== compileSession) {
          throw new RetikzVanillaError(
            RetikzVanillaErrorCode.Processing,
            'Vanilla compile driver must preserve its session for a retained processing controller',
          );
        }
        const nextCompositeRevision = definitions.changed ? compositeRevision + 1 : compositeRevision;
        const nextCompileDriverRevision = hasCustomCompileDriver ? compileDriverRevision + 1 : compileDriverRevision;
        participantPrepared = next;
        participantRevision = revision;
        runtime.update({
          baseRevision: runtime.revision(),
          sources: [
            createRuntimeSourceUpdate(CoreSourceDefinition, next.source),
            createRuntimeSourceUpdate(CoreCompositeInputSourceDefinition, next.coreOptions.compositeInputs),
            ...(definitions.changed
              ? [createRuntimeSourceUpdate(VanillaCompositeRevisionSourceDefinition, nextCompositeRevision)]
              : []),
            ...(hasCustomCompileDriver
              ? [createRuntimeSourceUpdate(VanillaCompileDriverRevisionSourceDefinition, nextCompileDriverRevision)]
              : []),
            ...(transactionParticipant?.update({ prepared: next, revision, kind: 'source' }) ?? []),
          ],
        });
        definitions.commit();
        compositeRevision = nextCompositeRevision;
        compileDriverRevision = nextCompileDriverRevision;
        driverInput = nextDriverInput;
        prepared = next;
        current = runtime.participant(resultParticipant);
        commitDriver();
        return current;
      } catch (cause) {
        participantPrepared = prepared;
        participantRevision = current.revision;
        definitions.rollback();
        try {
          restoreVanillaCompileDriverSession(compileDriver, previousDriverInput, compileSession);
        } catch (restoreCause) {
          throw new RetikzVanillaError(
            RetikzVanillaErrorCode.Processing,
            'Vanilla compile driver input rollback failed',
            {
              cause: restoreCause,
            },
          );
        }
        throw cause;
      }
    },
    updateParticipant: revision => {
      if (transactionParticipant?.updateParticipant === undefined) {
        throw new RetikzVanillaError(
          RetikzVanillaErrorCode.Processing,
          'createProcessingController: participant configuration is unavailable',
        );
      }
      participantPrepared = prepared;
      participantRevision = revision;
      try {
        runtime.update({
          baseRevision: runtime.revision(),
          sources: transactionParticipant.updateParticipant(revision),
        });
        current = runtime.participant(resultParticipant);
        commitDriver();
        return current;
      } catch (cause) {
        participantRevision = current.revision;
        throw cause;
      }
    },
    commitDriver,
    diagnostics: runtime.diagnostics,
    dispose: () => runtime.dispose(),
  });
};

/** 创建带可选固定内部 participant 的 processing controller */
const createProcessingController = (
  source: ProcessingSource,
  options: ProcessingOptions = {},
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
  initialPrepared?: PreparedProcessingInput,
  assertInitial?: () => void,
): PreparedInputProcessingController => {
  let assertCurrent = assertInitial ?? (() => undefined);
  const fixedOptions = captureProcessingOptions(options);
  const initial = initialPrepared ?? prepareProcessingInput(source, fixedOptions);
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
  assertCurrent();
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
      () => assertCurrent(),
      participantFactory,
    );
  let state = createState(initial, initialDriverInput, 0, transactionParticipantFactory);
  let current = state.read();
  state.commitDriver();
  assertCurrent = () => undefined;
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
    if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Processing controller is disposed');
  };

  const applyPrepared = (next: PreparedProcessingInput): void => {
    assertActive();
    const nextDriverInput = driverInput(next);
    if (!state.compositeDefinitions.isCompatible(next.coreOptions.composites)) {
      const previous = state;
      let candidate: RetainedProcessingState;
      try {
        const candidateCompileSession = createVanillaCompileDriverSession(compileDriver, nextDriverInput);
        assertCurrent();
        if (candidateCompileSession !== compileSession) {
          throw new RetikzVanillaError(
            RetikzVanillaErrorCode.Processing,
            'Vanilla compile driver must preserve its session for a retained processing controller',
          );
        }
        candidate = createState(next, nextDriverInput, current.revision + 1, transactionParticipantFactory);
      } catch (cause) {
        try {
          restoreVanillaCompileDriverSession(compileDriver, previous.driverInput(), compileSession);
        } catch (restoreCause) {
          const rollbackCause = new RetikzVanillaError(
            RetikzVanillaErrorCode.Processing,
            'Vanilla compile driver input rollback failed',
            { cause: restoreCause },
          );
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
  };
  return Object.freeze({
    updatePrepared: (next, check) => {
      // 保留此前诊断，过期请求只清理自身事务产生的失败
      if (check !== undefined) diagnostics.push(...state.diagnostics());
      assertCurrent = check ?? (() => undefined);
      try {
        assertCurrent();
        applyPrepared(next);
      } catch (cause) {
        try {
          check?.();
        } catch {
          if (diagnostics.at(-1) === cause) diagnostics.pop();
          state.diagnostics();
        }
        throw cause;
      } finally {
        assertCurrent = () => undefined;
      }
    },
    update: nextSource => {
      assertActive();
      let next: PreparedProcessingInput;
      try {
        next = prepareProcessingInput(nextSource, fixedOptions);
      } catch (cause) {
        diagnostics.push(cause);
        throw cause;
      }
      applyPrepared(next);
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
): InternalProcessingController => createProcessingController(source, options, transactionParticipantFactory);

/** 异步作者贡献已就绪时复用 retained controller，而不是重建 Source 或静态 revision */
export const createPreparedInputProcessingController = (
  input: PreparedProcessingInput,
  options: ProcessingOptions,
  assertCurrent?: () => void,
): PreparedInputProcessingController =>
  createProcessingController(input.source, options, undefined, input, assertCurrent);
