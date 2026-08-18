import type {
  RetikzRuntimeOwnerErrorCodeValue,
  RuntimeOwnerExecutionResult,
  RuntimeOwnerLifecycleDiagnostic,
  RuntimeOwnerPhaseValue,
} from '../error';
import type { RuntimeIdentityLookup } from '../identity';
import type { RuntimeOwnerRegistry } from '../registry';
import type { RuntimeOwnerErasedExecutor } from './define';
import type { RuntimeChangeSet, RuntimeOwnerDefinition, RuntimeOwnerToken } from './types';

import { RuntimeDiagnosticCode } from '../diagnostic';
import {
  RetikzRuntimeError,
  RetikzRuntimeErrorCode,
  RetikzRuntimeOwnerError,
  RetikzRuntimeOwnerErrorCode,
  RuntimeOwnerPhase,
} from '../error';
import { createRuntimeIdentityLookup } from '../identity';
import { getRuntimeOwnerRegistryExecutor } from '../registry';

/** executor 准备完成但尚未发布的 owner value */
export type RuntimePreparedOwnerValue<TValue, TRead> = Readonly<{
  /** session-owned captured value */
  value: TValue;
  /** 可安全共享的 immutable read view */
  read: TRead;
  /** Definition 显式收集时建立的 validated identity lookup */
  identities?: RuntimeIdentityLookup;
}>;

/** Runtime 包内唯一消费 owner author callbacks 的 lifecycle executor */
export type RuntimeOwnerExecutor = Readonly<{
  /** capture、identity validation 与 read candidate view */
  prepare: <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    input: TInput,
    current?: RuntimePreparedOwnerValue<TValue, TRead>,
  ) => RuntimeOwnerExecutionResult<RuntimePreparedOwnerValue<TValue, TRead>>;
  /** 比较两个完整 captured value */
  compare: <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    left: RuntimePreparedOwnerValue<TValue, TRead>,
    right: RuntimePreparedOwnerValue<TValue, TRead>,
  ) => RuntimeOwnerExecutionResult<boolean>;
  /** 校验 change hint；validator throw 时立即 retire candidate */
  validateChangeSet: <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    previous: RuntimePreparedOwnerValue<TValue, TRead>,
    candidate: RuntimePreparedOwnerValue<TValue, TRead>,
    changeSet: RuntimeChangeSet<TChange>,
  ) => RuntimeOwnerExecutionResult<'valid' | 'fallback'>;
  /** exactly-once 释放一个 prepared owner value */
  retire: <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedOwnerValue<TValue, TRead>,
  ) => RuntimeOwnerExecutionResult<void>;
}>;

const createDisposeDiagnostic = (owner: string, cause: unknown): RuntimeOwnerLifecycleDiagnostic =>
  Object.freeze({
    code: RuntimeDiagnosticCode.OwnerDisposeFailed,
    owner,
    phase: RuntimeOwnerPhase.Retire,
    message: cause instanceof Error ? cause.message : String(cause),
    cause,
  });

/** 释放一个 captured value，并把 dispose throw 隔离为 secondary diagnostic */
const disposeValue = <TInput, TValue, TRead, TChange>(
  definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  executor: RuntimeOwnerErasedExecutor,
  value: TValue,
): ReadonlyArray<RuntimeOwnerLifecycleDiagnostic> => {
  if (executor.dispose === undefined) return Object.freeze([]);
  try {
    executor.dispose(value);
    return Object.freeze([]);
  } catch (cause) {
    return Object.freeze([createDisposeDiagnostic(definition.key, cause)]);
  }
};

/** 创建保留 primary cause 与 cleanup diagnostics 的 lifecycle error */
const createLifecycleError = (
  code: Extract<
    RetikzRuntimeOwnerErrorCodeValue,
    | typeof RetikzRuntimeOwnerErrorCode.CaptureFailed
    | typeof RetikzRuntimeOwnerErrorCode.CollectIdentitiesFailed
    | typeof RetikzRuntimeOwnerErrorCode.ReadFailed
    | typeof RetikzRuntimeOwnerErrorCode.CompareFailed
    | typeof RetikzRuntimeOwnerErrorCode.ChangeSetValidationFailed
  >,
  owner: string,
  phase: RuntimeOwnerPhaseValue,
  cause: unknown,
  diagnostics: ReadonlyArray<RuntimeOwnerLifecycleDiagnostic> = [],
): RetikzRuntimeOwnerError => new RetikzRuntimeOwnerError({ code, owner, phase, cause, diagnostics });

/** 创建隔离 owner callback 失败与 dispose secondary diagnostics 的 executor */
export const createRuntimeOwnerExecutor = (registry: RuntimeOwnerRegistry): RuntimeOwnerExecutor => {
  const preparedDefinitions = new WeakMap<object, RuntimeOwnerToken>();
  const active = new WeakSet<object>();

  /** 校验 prepared value 属于当前 registry/Definition 且仍处于 active 生命周期 */
  const assertPrepared = <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedOwnerValue<TValue, TRead>,
  ): void => {
    getRuntimeOwnerRegistryExecutor(registry, definition);
    if (preparedDefinitions.get(prepared) !== definition) {
      throw new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.InternalInvariant,
        message: `runtime owner executor: prepared value does not belong to "${definition.key}"`,
        phase: 'owner-retire',
        cause: prepared,
      });
    }
    if (!active.has(prepared)) {
      throw new RetikzRuntimeError({
        code: RetikzRuntimeErrorCode.InternalInvariant,
        message: `runtime owner executor: prepared value for "${definition.key}" was already retired`,
        phase: 'owner-retire',
        cause: prepared,
      });
    }
  };

  /** 将 active value 标记为 retired，并隔离 dispose secondary diagnostic */
  const retire = <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedOwnerValue<TValue, TRead>,
  ): RuntimeOwnerExecutionResult<void> => {
    assertPrepared(definition, prepared);
    active.delete(prepared);
    const executor = getRuntimeOwnerRegistryExecutor(registry, definition);
    return Object.freeze({ value: undefined, diagnostics: disposeValue(definition, executor, prepared.value) });
  };

  return Object.freeze({
    prepare: <TInput, TValue, TRead, TChange>(
      definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
      source: TInput,
      current?: RuntimePreparedOwnerValue<TValue, TRead>,
    ): RuntimeOwnerExecutionResult<RuntimePreparedOwnerValue<TValue, TRead>> => {
      const executor = getRuntimeOwnerRegistryExecutor(registry, definition);
      let value: TValue;
      try {
        value = executor.capture<TInput, TValue>(source);
      } catch (cause) {
        throw createLifecycleError(
          RetikzRuntimeOwnerErrorCode.CaptureFailed,
          definition.key,
          RuntimeOwnerPhase.Capture,
          cause,
        );
      }
      if (current !== undefined && executor.dispose !== undefined && value === current.value) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.OwnerOwnershipAlias,
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
            RetikzRuntimeOwnerErrorCode.CollectIdentitiesFailed,
            definition.key,
            RuntimeOwnerPhase.CollectIdentities,
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
          RetikzRuntimeOwnerErrorCode.ReadFailed,
          definition.key,
          RuntimeOwnerPhase.Read,
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
      definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
      left: RuntimePreparedOwnerValue<TValue, TRead>,
      right: RuntimePreparedOwnerValue<TValue, TRead>,
    ): RuntimeOwnerExecutionResult<boolean> => {
      assertPrepared(definition, left);
      assertPrepared(definition, right);
      const executor = getRuntimeOwnerRegistryExecutor(registry, definition);
      try {
        return Object.freeze({ value: executor.equals(left.value, right.value), diagnostics: Object.freeze([]) });
      } catch (cause) {
        throw createLifecycleError(
          RetikzRuntimeOwnerErrorCode.CompareFailed,
          definition.key,
          RuntimeOwnerPhase.Compare,
          cause,
        );
      }
    },

    validateChangeSet: <TInput, TValue, TRead, TChange>(
      definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
      previous: RuntimePreparedOwnerValue<TValue, TRead>,
      candidate: RuntimePreparedOwnerValue<TValue, TRead>,
      changeSet: RuntimeChangeSet<TChange>,
    ): RuntimeOwnerExecutionResult<'valid' | 'fallback'> => {
      assertPrepared(definition, previous);
      assertPrepared(definition, candidate);
      const executor = getRuntimeOwnerRegistryExecutor(registry, definition);
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
          RetikzRuntimeOwnerErrorCode.ChangeSetValidationFailed,
          definition.key,
          RuntimeOwnerPhase.ValidateChangeSet,
          cause,
          diagnostics,
        );
      }
    },

    retire,
  });
};
