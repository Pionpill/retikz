import type { RuntimeOwnerExecutionResult } from '../error';
import type {
  RuntimeChangeSet,
  RuntimeOwnerDefinition,
  RuntimeOwnerExecutor,
  RuntimeOwnerToken,
  RuntimePreparedOwnerValue,
  RuntimeRevision,
} from '../owner';
import type { RuntimeOwnerInput, RuntimeOwnerUpdate, RuntimeSnapshot } from './types';

import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';

/** command 私有保存的 owner 输入与 lifecycle 入口 */
export type RuntimeOwnerCommandExecutor = Readonly<{
  /** command 关联的具体 owner token */
  owner: RuntimeOwnerToken;
  /** 使用 registry-bound executor 捕获 concrete owner input */
  prepare: (
    executor: RuntimeOwnerExecutor,
    current?: RuntimePreparedOwnerValue<unknown, unknown>,
  ) => RuntimeOwnerExecutionResult<RuntimePreparedOwnerValue<unknown, unknown>>;
  /** 比较 previous 与 candidate 的完整 captured value */
  compare: (
    executor: RuntimeOwnerExecutor,
    previous: RuntimePreparedOwnerValue<unknown, unknown>,
    candidate: RuntimePreparedOwnerValue<unknown, unknown>,
  ) => RuntimeOwnerExecutionResult<boolean>;
  /** 校验 concrete change hint，缺少 hint 时不存在 */
  validateChangeSet?: (
    executor: RuntimeOwnerExecutor,
    previous: RuntimePreparedOwnerValue<unknown, unknown>,
    candidate: RuntimePreparedOwnerValue<unknown, unknown>,
  ) => RuntimeOwnerExecutionResult<'valid' | 'fallback'>;
  /** 释放一个 prepared owner value */
  retire: (
    executor: RuntimeOwnerExecutor,
    prepared: RuntimePreparedOwnerValue<unknown, unknown>,
  ) => RuntimeOwnerExecutionResult<void>;
  /** update 携带的 change hint base revision */
  changeSetBaseRevision?: RuntimeRevision;
  /** 以 concrete owner read 类型创建 revision-bound Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedOwnerValue<unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<TRead>;
  /** 读取 concrete owner change hint */
  changeSet: <TInput, TValue, TRead, TChange>(
    owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
}>;

const runtimeChangeSets = new WeakSet<object>();
const runtimeOwnerCommands = new WeakSet<object>();
const runtimeOwnerCommandExecutors = new WeakMap<object, RuntimeOwnerCommandExecutor>();

/** 判断一个值是否是合法 Runtime revision number */
export const isRuntimeRevision = (value: unknown): value is RuntimeRevision =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** 把已验证 safe integer 转成 Runtime 内部 revision */
export const createRuntimeRevision = (value: number): RuntimeRevision => {
  if (!isRuntimeRevision(value)) {
    throw new RetikzRuntimeError({ code: RetikzRuntimeErrorCode.RevisionInvalid, phase: 'revision', cause: value });
  }
  return value;
};

/** 为非空 transaction 创建下一 revision，并在 safe integer 上界前 fail-loud */
export const createNextRuntimeRevision = (current: RuntimeRevision): RuntimeRevision => {
  if (!isRuntimeRevision(current)) {
    throw new RetikzRuntimeError({ code: RetikzRuntimeErrorCode.RevisionInvalid, phase: 'revision', cause: current });
  }
  if (current === Number.MAX_SAFE_INTEGER) {
    throw new RetikzRuntimeError({ code: RetikzRuntimeErrorCode.RevisionExhausted, phase: 'revision', cause: current });
  }
  return createRuntimeRevision(current + 1);
};

/** 判断 change set 是否由当前 Runtime factory 创建 */
export const isRuntimeChangeSet = (value: unknown): value is RuntimeChangeSet<unknown> =>
  typeof value === 'object' && value !== null && runtimeChangeSets.has(value);

/** 创建复制并冻结 changes 容器的 revision-bound change hint */
export const createRuntimeChangeSet = <TChange>(
  baseRevision: RuntimeRevision,
  changes: ReadonlyArray<TChange>,
): RuntimeChangeSet<TChange> => {
  if (!isRuntimeRevision(baseRevision)) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.RevisionInvalid,
      phase: 'revision',
      cause: baseRevision,
    });
  }
  if (!Array.isArray(changes)) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.ChangeSetInvalid,
      phase: 'change-set',
      cause: changes,
    });
  }
  const changeSet = Object.freeze({
    baseRevision,
    changes: Object.freeze([...changes]),
  }) as RuntimeChangeSet<TChange>;
  runtimeChangeSets.add(changeSet);
  return changeSet;
};

/** 在 concrete owner 泛型作用域内封装 lifecycle 与 change hint callback */
const createRuntimeOwnerCommandExecutor = <TInput, TValue, TRead, TChange>(
  owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
  changeSet?: RuntimeChangeSet<TChange>,
): RuntimeOwnerCommandExecutor => {
  const typedExecutor = Object.freeze({
    owner,
    prepare: (runtimeExecutor: RuntimeOwnerExecutor, current?: RuntimePreparedOwnerValue<TValue, TRead>) =>
      runtimeExecutor.prepare(owner, value, current),
    compare: (
      runtimeExecutor: RuntimeOwnerExecutor,
      previous: RuntimePreparedOwnerValue<TValue, TRead>,
      candidate: RuntimePreparedOwnerValue<TValue, TRead>,
    ) => runtimeExecutor.compare(owner, previous, candidate),
    validateChangeSet:
      changeSet === undefined
        ? undefined
        : (
            runtimeExecutor: RuntimeOwnerExecutor,
            previous: RuntimePreparedOwnerValue<TValue, TRead>,
            candidate: RuntimePreparedOwnerValue<TValue, TRead>,
          ) => runtimeExecutor.validateChangeSet(owner, previous, candidate, changeSet),
    retire: (runtimeExecutor: RuntimeOwnerExecutor, prepared: RuntimePreparedOwnerValue<TValue, TRead>) =>
      runtimeExecutor.retire(owner, prepared),
    changeSetBaseRevision: changeSet?.baseRevision,
    snapshot: (
      requestedOwner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
      prepared: RuntimePreparedOwnerValue<TValue, TRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TRead> => {
      if (requestedOwner !== owner) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.OwnerCommandInvalid,
          phase: 'snapshot',
          owner: requestedOwner.key,
          cause: requestedOwner,
        });
      }
      return Object.freeze({ revision, value: prepared.read });
    },
    changeSet: (
      requestedOwner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    ): RuntimeChangeSet<TChange> | undefined => {
      if (requestedOwner !== owner) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.OwnerCommandInvalid,
          phase: 'change-set',
          owner: requestedOwner.key,
          cause: requestedOwner,
        });
      }
      return changeSet;
    },
  });
  return typedExecutor as unknown as RuntimeOwnerCommandExecutor;
};

/** 在 concrete owner 泛型仍可见时创建初始 Snapshot command */
export const createRuntimeOwnerInput = <TInput, TValue, TRead, TChange>(
  owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
): RuntimeOwnerInput => {
  const command = Object.freeze({ owner, kind: 'initial' as const }) as unknown as RuntimeOwnerInput;
  const executor = createRuntimeOwnerCommandExecutor(owner, value);
  runtimeOwnerCommands.add(command);
  runtimeOwnerCommandExecutors.set(command, executor);
  return command;
};

/** 在 concrete owner 泛型仍可见时创建更新 Snapshot command */
export const createRuntimeOwnerUpdate = <TInput, TValue, TRead, TChange>(
  owner: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
  changeSet?: RuntimeChangeSet<TChange>,
): RuntimeOwnerUpdate => {
  if (changeSet !== undefined && !isRuntimeChangeSet(changeSet)) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.ChangeSetInvalid,
      phase: 'change-set',
      owner: owner.key,
      cause: changeSet,
    });
  }
  const command = Object.freeze({ owner, kind: 'update' as const }) as unknown as RuntimeOwnerUpdate;
  const executor = createRuntimeOwnerCommandExecutor(owner, value, changeSet);
  runtimeOwnerCommands.add(command);
  runtimeOwnerCommandExecutors.set(command, executor);
  return command;
};

/** 读取 opaque owner command 的私有执行入口 */
export const getRuntimeOwnerCommandExecutor = (
  command: RuntimeOwnerInput | RuntimeOwnerUpdate,
): RuntimeOwnerCommandExecutor => {
  const candidate: unknown = command;
  if (typeof candidate !== 'object' || candidate === null || !runtimeOwnerCommands.has(candidate)) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.OwnerCommandInvalid,
      phase: 'command',
      cause: command,
    });
  }
  const executor = runtimeOwnerCommandExecutors.get(command);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'runtime owner command: missing executor',
      phase: 'owner-command',
      cause: command,
    });
  }
  return executor;
};
