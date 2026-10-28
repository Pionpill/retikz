import type { AnyCompositeDefinition } from '@retikz/core';
import type { ReconcilerCommitTarget, ReconcilerOutput } from '@retikz/reconciler';
import { ReconcilerSession } from '@retikz/reconciler';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type {
  InputVanillaCompileDriver,
  VanillaCompileDriver,
  VanillaCompileDriverSession,
} from '../../runtime/compile-driver';
import {
  commitVanillaCompileOutput,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
  resolveVanillaCompileOutput,
} from '../../runtime/compile-driver';
import { createRetainedCompositeDefinitions } from '../composites';
import { prepareProcessingInput } from '../prepare';
import type { InputPreparedProcessing, ProcessingOptions, ProcessingResult, ProcessingSource } from '../types';
import type {
  InternalProcessingController,
  PreparedInputProcessingController,
  ProcessingTransactionParticipantFactory,
} from './types';

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
  input: InputVanillaCompileDriver,
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
  prepared: InputPreparedProcessing,
  output: ReconcilerOutput<ReadonlyArray<AnyCompositeDefinition>>,
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
  driverInput: () => InputVanillaCompileDriver;
  /** 读取该 session 的已提交结果 */
  read: () => ProcessingResult;
  /** 在固定 topology 内更新 source */
  update: (
    next: InputPreparedProcessing,
    nextDriverInput: InputVanillaCompileDriver,
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
  initial: InputPreparedProcessing,
  initialDriverInput: InputVanillaCompileDriver,
  initialRevision: number,
  compileDriver: NonNullable<ProcessingOptions['compileDriver']>,
  compileSession: VanillaCompileDriverSession,
  assertCurrent: () => void,
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
): RetainedProcessingState => {
  const compositeDefinitions = createRetainedCompositeDefinitions(initial.coreOptions.composites);
  let driverInput = initialDriverInput;
  let prepared = initial;
  let participantPrepared = initial;
  let participantRevision = initialRevision;
  let current: ProcessingResult | undefined;
  const resolveReadonlyLayers = (output: ReconcilerOutput<ReadonlyArray<AnyCompositeDefinition>>) =>
    resolveVanillaCompileOutput(compileSession, output).layers;
  const participant = transactionParticipantFactory?.({ initial, resolveReadonlyLayers });
  const target: ReconcilerCommitTarget = {
    prepare: (candidate, previous) => {
      const next = createProcessingResult(
        participantRevision,
        participantPrepared,
        candidate.compilation,
        compileSession,
      );
      assertCurrent();
      const token = participant?.target.prepare(candidate, previous);
      const before = current;
      return {
        commit: () => {
          assertCurrent();
          token?.commit();
          current = next;
        },
        rollback: () => {
          token?.rollback();
          current = before;
        },
        dispose: () => token?.dispose(),
      };
    },
    dispose: () => participant?.target.dispose?.(),
  };
  const session = new ReconcilerSession(initial.coreOptions, {
    captureProvenance: participant !== undefined,
    target,
  });
  try {
    session.mount(initial.source);
    participant?.connect?.();
  } catch (cause) {
    session.dispose();
    throw cause;
  }
  const read = (): ProcessingResult => {
    session.read();
    if (current === undefined)
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Processing output unavailable');
    return current;
  };
  const commitDriver = (): void =>
    commitVanillaCompileOutput(compileSession, resolveVanillaCompileOutput(compileSession, session.read().compilation));
  // 完整输入入口不推断局部操作；局部更新由 Reconciler 的 WeaveBatch 入口承接
  return {
    compositeDefinitions,
    driverInput: () => driverInput,
    read,
    update: (next, nextDriverInput, revision) => {
      const previousDriverInput = driverInput;
      const previousRevision = participantRevision;
      try {
        const nextSession = createVanillaCompileDriverSession(compileDriver, nextDriverInput);
        assertCurrent();
        if (nextSession !== compileSession)
          throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Compile driver changed session identity');
        participantPrepared = next;
        participantRevision = revision;
        participant?.update({ prepared: next, revision, kind: 'source' });
        session.replace(next.source, next.coreOptions);
        prepared = next;
        driverInput = nextDriverInput;
        commitDriver();
        return read();
      } catch (cause) {
        participantPrepared = prepared;
        participantRevision = previousRevision;
        try {
          restoreVanillaCompileDriverSession(compileDriver, previousDriverInput, compileSession);
        } catch (recoveryError) {
          throw new RetikzVanillaError({
            code: RetikzVanillaErrorCode.Processing,
            message: 'Failed to restore compile driver',
            cause,
            details: { recoveryError },
          });
        }
        throw cause;
      }
    },
    updateParticipant: revision => {
      if (participant?.updateParticipant === undefined)
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Processing, 'Renderer configuration is unavailable');
      participantRevision = revision;
      participant.updateParticipant(revision);
      session.updateTarget();
      commitDriver();
      return read();
    },
    commitDriver,
    diagnostics: () => session.diagnostics(),
    dispose: () => session.dispose(),
  };
};

/** 创建带可选固定内部 participant 的 processing controller */
const createProcessingController = (
  source: ProcessingSource,
  options: ProcessingOptions = {},
  transactionParticipantFactory?: ProcessingTransactionParticipantFactory,
  initialPrepared?: InputPreparedProcessing,
  assertInitial?: () => void,
): PreparedInputProcessingController => {
  let assertCurrent = assertInitial ?? (() => undefined);
  const fixedOptions = captureProcessingOptions(options);
  const initial = initialPrepared ?? prepareProcessingInput(source, fixedOptions);
  const compileDriver = fixedOptions.compileDriver ?? defaultVanillaCompileDriver;
  const instance = Object.freeze({});

  const driverInput = (prepared: InputPreparedProcessing): InputVanillaCompileDriver =>
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
    prepared: InputPreparedProcessing,
    input: InputVanillaCompileDriver,
    revision: number,
    participantFactory?: ProcessingTransactionParticipantFactory,
  ): RetainedProcessingState =>
    createRetainedProcessingState(
      prepared,
      input,
      revision,
      compileDriver,
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

  const applyPrepared = (next: InputPreparedProcessing): void => {
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
      let next: InputPreparedProcessing;

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
  input: InputPreparedProcessing,
  options: ProcessingOptions,
  assertCurrent?: () => void,
): PreparedInputProcessingController =>
  createProcessingController(input.source, options, undefined, input, assertCurrent);
