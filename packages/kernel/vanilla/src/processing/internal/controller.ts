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
} from '@retikz/runtime';

import type { VanillaCompileDriverInput, VanillaCompileDriverSession } from '../../runtime/compile-driver';
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
  const compositeDefinitions = createRetainedCompositeDefinitions(initial.coreOptions.composites);
  let driverInput: VanillaCompileDriverInput = Object.freeze({
    instance,
    source: initial.source,
    authoringSites: initial.authoringSites,
    coreOptions: initial.coreOptions,
  });
  const compileSession = createVanillaCompileDriverSession(compileDriver, driverInput);
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
  let participantPrepared: PreparedProcessingInput = initial;
  let participantRevision = 0;
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
  const session = createRuntimeSession({
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
  transactionParticipant?.connect?.(session);
  let prepared = initial;
  let compositeRevision = 0;
  let compileDriverRevision = 0;
  let current = session.participant(resultParticipant);
  commitVanillaCompileOutput(
    compileSession,
    resolveVanillaCompileOutput(compileSession, session.artifact(coreProgram).value.output),
  );
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
    if (disposed) {
      session.update({ baseRevision: session.revision(), owners: [] });
    }
  };

  const rollbackDriverInput = (
    previous: VanillaCompileDriverInput,
    definitions: ReturnType<typeof compositeDefinitions.prepare>,
    cause: unknown,
  ): never => {
    definitions.rollback();
    try {
      const restored = createVanillaCompileDriverSession(compileDriver, previous);
      if (restored !== compileSession) throw new Error('Vanilla compile driver restore changed session identity');
    } catch (restoreCause) {
      throw new Error('Vanilla compile driver input rollback failed', { cause: restoreCause });
    }
    throw cause;
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
      const definitions = compositeDefinitions.prepare(next.coreOptions.composites);
      const previousDriverInput = driverInput;
      const nextDriverInput: VanillaCompileDriverInput = Object.freeze({
        instance,
        source: next.source,
        authoringSites: next.authoringSites,
        coreOptions: next.coreOptions,
      });
      try {
        const nextCompileSession = createVanillaCompileDriverSession(compileDriver, nextDriverInput);
        if (nextCompileSession !== compileSession) {
          throw new Error('Vanilla compile driver must preserve its session for a retained processing controller');
        }
        const nextCompositeRevision = definitions.changed ? compositeRevision + 1 : compositeRevision;
        const nextCompileDriverRevision = hasCustomCompileDriver ? compileDriverRevision + 1 : compileDriverRevision;
        participantPrepared = next;
        participantRevision = current.revision + 1;
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
            ...(transactionParticipant?.update({ prepared: next, revision: participantRevision, kind: 'source' }) ??
              []),
          ],
        });
        definitions.commit();
        compositeRevision = nextCompositeRevision;
        compileDriverRevision = nextCompileDriverRevision;
        driverInput = nextDriverInput;
        prepared = next;
        const output = session.artifact(coreProgram).value.output;
        const nextResult = session.participant(resultParticipant);
        commitVanillaCompileOutput(compileSession, resolveVanillaCompileOutput(compileSession, output));
        current = nextResult;
        notifyListeners(nextResult);
      } catch (cause) {
        participantPrepared = prepared;
        participantRevision = current.revision;
        try {
          rollbackDriverInput(previousDriverInput, definitions, cause);
        } catch (rollbackCause) {
          diagnostics.push(rollbackCause);
          throw rollbackCause;
        }
      }
    },
    read: () => current,
    subscribe: listener => {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    diagnostics: () => {
      const result = Object.freeze([...diagnostics, ...session.diagnostics()]);
      diagnostics.length = 0;
      return result;
    },
    dispose: () => {
      disposed = true;
      listeners.clear();
      session.dispose();
    },
    updateParticipant: () => {
      assertActive();
      if (transactionParticipant?.updateParticipant === undefined) {
        throw new Error('createProcessingController: participant configuration is unavailable');
      }
      participantPrepared = prepared;
      participantRevision = current.revision + 1;
      try {
        session.update({
          baseRevision: session.revision(),
          owners: transactionParticipant.updateParticipant(participantRevision),
        });
        const output = session.artifact(coreProgram).value.output;
        commitVanillaCompileOutput(compileSession, resolveVanillaCompileOutput(compileSession, output));
        current = session.participant(resultParticipant);
        notifyListeners(current);
      } catch (cause) {
        participantRevision = current.revision;
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
