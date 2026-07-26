import type { RuntimeOwnerExecutionResult } from '../error';
import type {
  RuntimeChangeSet,
  RuntimeOwnerDefinition,
  RuntimeOwnerExecutor,
  RuntimeOwnerToken,
  RuntimePreparedOwnerValue,
  RuntimeRevision,
} from '../owner';
import type { RuntimeOwnerInput, RuntimeOwnerUpdate } from './types';

import { RuntimeError } from '../error';

/** command 私有保存的 owner 输入与 lifecycle 入口 */
export type RuntimeOwnerCommandExecutor = Readonly<{
  /** command 关联的具体 owner token */
  owner: RuntimeOwnerToken;
  /** 使用 registry-bound executor 捕获 concrete owner input */
  prepare: (executor: RuntimeOwnerExecutor) => RuntimeOwnerExecutionResult<RuntimePreparedOwnerValue<unknown, unknown>>;
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
}>;

const runtimeChangeSets = new WeakSet<object>();
const runtimeOwnerCommands = new WeakSet<object>();
const runtimeOwnerCommandExecutors = new WeakMap<object, RuntimeOwnerCommandExecutor>();

/** 判断一个值是否是合法 Runtime revision number */
export const isRuntimeRevision = (value: unknown): value is RuntimeRevision =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** 判断 change set 是否由当前 Runtime factory 创建 */
export const isRuntimeChangeSet = (value: unknown): value is RuntimeChangeSet<unknown> =>
  typeof value === 'object' && value !== null && runtimeChangeSets.has(value);

/** 创建复制并冻结 changes 容器的 revision-bound change hint */
export const createRuntimeChangeSet = <TChange>(
  baseRevision: RuntimeRevision,
  changes: ReadonlyArray<TChange>,
): RuntimeChangeSet<TChange> => {
  if (!isRuntimeRevision(baseRevision)) {
    throw new RuntimeError({ code: 'RUNTIME_REVISION_INVALID', phase: 'revision', cause: baseRevision });
  }
  if (!Array.isArray(changes)) {
    throw new RuntimeError({ code: 'RUNTIME_CHANGESET_INVALID', phase: 'change-set', cause: changes });
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
    prepare: (runtimeExecutor: RuntimeOwnerExecutor) => runtimeExecutor.prepare(owner, value),
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
    throw new RuntimeError({
      code: 'RUNTIME_CHANGESET_INVALID',
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
    throw new RuntimeError({ code: 'RUNTIME_OWNER_COMMAND_INVALID', phase: 'command', cause: command });
  }
  const executor = runtimeOwnerCommandExecutors.get(command);
  if (executor === undefined) throw new Error('runtime owner command: missing executor');
  return executor;
};
