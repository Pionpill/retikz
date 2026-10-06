import { RuntimeDiagnosticCode } from '../diagnostic';
import type { RuntimeSourceExecutionResult, RuntimeSourceLifecycleDiagnostic } from '../error';
import { RetikzRuntimeError, RetikzRuntimeErrorCode, RuntimeSourcePhase } from '../error';
import type { RuntimeIdentityLookup } from '../identity';
import { createRuntimeIdentityLookup } from '../identity';
import type { RuntimeSourceRegistry } from '../registry';
import { getRuntimeSourceRegistryExecutor } from '../registry';
import type { RuntimeSourceErasedExecutor } from './define';
import type { RuntimeChangeSet, RuntimeSourceDefinition, RuntimeSourceToken } from './types';

/**
 * executor 准备完成但尚未发布的 source value
 * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
 * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
 */
export type RuntimePreparedSourceValue<TValue, TRead> = Readonly<{
  /** 运行时捕获并持有的值 */
  value: TValue;
  /** 可安全共享的 immutable read view */
  read: TRead;
  /** Definition 显式收集时建立的 validated identity lookup */
  identities?: RuntimeIdentityLookup;
}>;

/** Runtime 包内唯一消费 source author callbacks 的 lifecycle executor */
export type RuntimeSourceExecutor = Readonly<{
  /**
   * capture、identity validation 与 read candidate view
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  prepare: <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    input: TInput,
    current?: RuntimePreparedSourceValue<TValue, TRead>,
  ) => RuntimeSourceExecutionResult<RuntimePreparedSourceValue<TValue, TRead>>;
  /**
   * 比较两个完整 captured value
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  compare: <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    left: RuntimePreparedSourceValue<TValue, TRead>,
    right: RuntimePreparedSourceValue<TValue, TRead>,
  ) => RuntimeSourceExecutionResult<boolean>;
  /**
   * 校验 change hint；validator throw 时立即 retire candidate
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  validateChangeSet: <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    previous: RuntimePreparedSourceValue<TValue, TRead>,
    candidate: RuntimePreparedSourceValue<TValue, TRead>,
    changeSet: RuntimeChangeSet<TChange>,
  ) => RuntimeSourceExecutionResult<'valid' | 'fallback'>;
  /**
   * exactly-once 释放一个 prepared source value
   * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
   * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
   * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
   * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
   */
  retire: <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedSourceValue<TValue, TRead>,
  ) => RuntimeSourceExecutionResult<void>;
}>;

/**
 * 释放已捕获的值，并将释放回调抛出的异常转换为诊断
 * @returns 未定义 dispose 或释放正常完成时返回空数组；释放回调抛出异常时返回包含一条释放失败诊断的只读数组，保留原始异常为 cause
 * @remarks 释放异常不向外抛出，由上层收集诊断，避免打断后续清理或掩盖已有的主要错误
 */
const disposeValue = <TInput, TValue, TRead, TChange>(
  definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  executor: RuntimeSourceErasedExecutor,
  value: TValue,
): ReadonlyArray<RuntimeSourceLifecycleDiagnostic> => {
  if (executor.dispose === undefined) return Object.freeze([]);

  try {
    executor.dispose(value);
    return Object.freeze([]);
  } catch (cause) {
    return Object.freeze([
      Object.freeze<RuntimeSourceLifecycleDiagnostic>({
        code: RuntimeDiagnosticCode.SourceDisposeFailed,
        owner: definition.key,
        phase: RuntimeSourcePhase.Retire,
        severity: 'error',
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
      }),
    ]);
  }
};

/** 创建保留 primary cause 与 cleanup diagnostics 的 lifecycle error */
const createLifecycleError = (
  code: Extract<
    RetikzRuntimeErrorCode,
    | typeof RetikzRuntimeErrorCode.CaptureFailed
    | typeof RetikzRuntimeErrorCode.CollectIdentitiesFailed
    | typeof RetikzRuntimeErrorCode.ReadFailed
    | typeof RetikzRuntimeErrorCode.CompareFailed
    | typeof RetikzRuntimeErrorCode.ChangeSetValidationFailed
  >,
  source: string,
  phase: RuntimeSourcePhase,
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeSourceLifecycleDiagnostic> = [],
): RetikzRuntimeError =>
  new RetikzRuntimeError({
    code,
    owner: source,
    phase,
    message: `${code}: source "${source}" failed during ${phase}`,
    cause,
    diagnostics,
  });

/** 创建隔离 source callback 失败与 dispose secondary diagnostics 的 executor */
export const createRuntimeSourceExecutor = (registry: RuntimeSourceRegistry): RuntimeSourceExecutor => {
  const preparedDefinitions = new WeakMap<object, RuntimeSourceToken>();
  const active = new WeakSet<object>();

  /** 校验 prepared value 属于当前 registry/Definition 且仍处于 active 生命周期 */
  const assertPrepared = <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedSourceValue<TValue, TRead>,
  ): void => {
    getRuntimeSourceRegistryExecutor(registry, definition);
    if (preparedDefinitions.get(prepared) !== definition) {
      throw new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.InternalInvariant,
        message: `runtime source executor: prepared value does not belong to "${definition.key}"`,
        phase: 'source-retire',
        cause: prepared,
      });
    }

    if (!active.has(prepared)) {
      throw new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.InternalInvariant,
        message: `runtime source executor: prepared value for "${definition.key}" was already retired`,
        phase: 'source-retire',
        cause: prepared,
      });
    }
  };

  /** 将 active value 标记为 retired，并隔离 dispose secondary diagnostic */
  const retire = <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedSourceValue<TValue, TRead>,
  ): RuntimeSourceExecutionResult<void> => {
    assertPrepared(definition, prepared);
    active.delete(prepared);
    const executor = getRuntimeSourceRegistryExecutor(registry, definition);

    return Object.freeze({ value: undefined, diagnostics: disposeValue(definition, executor, prepared.value) });
  };

  return Object.freeze({
    prepare: <TInput, TValue, TRead, TChange>(
      definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
      source: TInput,
      current?: RuntimePreparedSourceValue<TValue, TRead>,
    ): RuntimeSourceExecutionResult<RuntimePreparedSourceValue<TValue, TRead>> => {
      const executor = getRuntimeSourceRegistryExecutor(registry, definition);
      let value: TValue;

      try {
        value = executor.capture<TInput, TValue>(source);
      } catch (cause) {
        throw createLifecycleError(
          RetikzRuntimeErrorCode.CaptureFailed,
          definition.key,
          RuntimeSourcePhase.Capture,
          cause,
        );
      }

      if (current !== undefined && executor.dispose !== undefined && value === current.value) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.SourceOwnershipAlias,
          phase: 'capture',
          owner: definition.key,
          cause: value,
        });
      }

      let identities: RuntimeIdentityLookup | undefined;
      if (executor.collectIdentities !== undefined) {
        try {
          const collected = executor.collectIdentities(value);
          identities = createRuntimeIdentityLookup(definition.key, collected);
        } catch (cause) {
          const diagnostics = disposeValue(definition, executor, value);
          throw createLifecycleError(
            RetikzRuntimeErrorCode.CollectIdentitiesFailed,
            definition.key,
            RuntimeSourcePhase.CollectIdentities,
            cause,
            diagnostics,
          );
        }
      }

      let read: TRead;

      try {
        read = executor.read<TValue, TRead>(value);
      } catch (cause) {
        const diagnostics = disposeValue(definition, executor, value);
        throw createLifecycleError(
          RetikzRuntimeErrorCode.ReadFailed,
          definition.key,
          RuntimeSourcePhase.Read,
          cause,
          diagnostics,
        );
      }

      const prepared = Object.freeze({ value, read, identities });
      preparedDefinitions.set(prepared, definition);
      active.add(prepared);

      return Object.freeze({ value: prepared, diagnostics: Object.freeze([]) });
    },

    compare: <TInput, TValue, TRead, TChange>(
      definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
      left: RuntimePreparedSourceValue<TValue, TRead>,
      right: RuntimePreparedSourceValue<TValue, TRead>,
    ): RuntimeSourceExecutionResult<boolean> => {
      assertPrepared(definition, left);
      assertPrepared(definition, right);
      const executor = getRuntimeSourceRegistryExecutor(registry, definition);

      try {
        return Object.freeze({ value: executor.equals(left.value, right.value), diagnostics: Object.freeze([]) });
      } catch (cause) {
        throw createLifecycleError(
          RetikzRuntimeErrorCode.CompareFailed,
          definition.key,
          RuntimeSourcePhase.Compare,
          cause,
        );
      }
    },

    validateChangeSet: <TInput, TValue, TRead, TChange>(
      definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
      previous: RuntimePreparedSourceValue<TValue, TRead>,
      candidate: RuntimePreparedSourceValue<TValue, TRead>,
      changeSet: RuntimeChangeSet<TChange>,
    ): RuntimeSourceExecutionResult<'valid' | 'fallback'> => {
      assertPrepared(definition, previous);
      assertPrepared(definition, candidate);
      const executor = getRuntimeSourceRegistryExecutor(registry, definition);
      if (executor.validateChangeSet === undefined) {
        return Object.freeze({ value: 'valid', diagnostics: Object.freeze([]) });
      }

      try {
        return Object.freeze({
          value: executor.validateChangeSet(previous.read, candidate.read, changeSet),
          diagnostics: Object.freeze([]),
        });
      } catch (cause) {
        const diagnostics = retire(definition, candidate).diagnostics;
        throw createLifecycleError(
          RetikzRuntimeErrorCode.ChangeSetValidationFailed,
          definition.key,
          RuntimeSourcePhase.ValidateChangeSet,
          cause,
          diagnostics,
        );
      }
    },

    retire,
  });
};
