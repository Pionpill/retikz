import type { RuntimeSourceExecutionResult } from '../error';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type {
  RuntimeChangeSet,
  RuntimeSourceDefinition,
  RuntimeSourceExecutor,
  RuntimeSourceToken,
  RuntimePreparedSourceValue,
  RuntimeRevision,
} from '../source';
import type { RuntimeSourceInput, RuntimeSourceUpdate, RuntimeSnapshot } from './types';

/** command 私有保存的 source 输入与 lifecycle 入口 */
export type RuntimeSourceCommandExecutor = Readonly<{
  /** command 关联的具体 source token */
  source: RuntimeSourceToken;
  /** 使用 registry-bound executor 捕获 concrete source input */
  prepare: (
    executor: RuntimeSourceExecutor,
    current?: RuntimePreparedSourceValue<unknown, unknown>,
  ) => RuntimeSourceExecutionResult<RuntimePreparedSourceValue<unknown, unknown>>;
  /** 比较 previous 与 candidate 的完整 captured value */
  compare: (
    executor: RuntimeSourceExecutor,
    previous: RuntimePreparedSourceValue<unknown, unknown>,
    candidate: RuntimePreparedSourceValue<unknown, unknown>,
  ) => RuntimeSourceExecutionResult<boolean>;
  /** 校验 concrete change hint，缺少 hint 时不存在 */
  validateChangeSet?: (
    executor: RuntimeSourceExecutor,
    previous: RuntimePreparedSourceValue<unknown, unknown>,
    candidate: RuntimePreparedSourceValue<unknown, unknown>,
  ) => RuntimeSourceExecutionResult<'valid' | 'fallback'>;
  /** 释放一个 prepared source value */
  retire: (
    executor: RuntimeSourceExecutor,
    prepared: RuntimePreparedSourceValue<unknown, unknown>,
  ) => RuntimeSourceExecutionResult<void>;
  /** update 携带的 change hint base revision */
  changeSetBaseRevision?: RuntimeRevision;
  /** 以 concrete source read 类型创建 revision-bound Snapshot */
  snapshot: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    prepared: RuntimePreparedSourceValue<unknown, unknown>,
    revision: RuntimeRevision,
  ) => RuntimeSnapshot<TRead>;
  /** 读取 concrete source change hint */
  changeSet: <TInput, TValue, TRead, TChange>(
    source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeChangeSet<TChange> | undefined;
}>;

const runtimeChangeSets = new WeakSet<object>();

const runtimeSourceCommands = new WeakSet<object>();

const runtimeSourceCommandExecutors = new WeakMap<object, RuntimeSourceCommandExecutor>();

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

  const changeSet = Object.freeze({
    baseRevision,
    changes: Object.freeze([...changes]),
  }) as RuntimeChangeSet<TChange>;
  runtimeChangeSets.add(changeSet);

  return changeSet;
};

/** 在 concrete source 泛型作用域内封装 lifecycle 与 change hint callback */
const createRuntimeSourceCommandExecutor = <TInput, TValue, TRead, TChange>(
  source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
  changeSet?: RuntimeChangeSet<TChange>,
): RuntimeSourceCommandExecutor => {
  const typedExecutor = Object.freeze({
    source,
    prepare: (runtimeExecutor: RuntimeSourceExecutor, current?: RuntimePreparedSourceValue<TValue, TRead>) =>
      runtimeExecutor.prepare(source, value, current),
    compare: (
      runtimeExecutor: RuntimeSourceExecutor,
      previous: RuntimePreparedSourceValue<TValue, TRead>,
      candidate: RuntimePreparedSourceValue<TValue, TRead>,
    ) => runtimeExecutor.compare(source, previous, candidate),
    validateChangeSet:
      changeSet === undefined
        ? undefined
        : (
            runtimeExecutor: RuntimeSourceExecutor,
            previous: RuntimePreparedSourceValue<TValue, TRead>,
            candidate: RuntimePreparedSourceValue<TValue, TRead>,
          ) => runtimeExecutor.validateChangeSet(source, previous, candidate, changeSet),
    retire: (runtimeExecutor: RuntimeSourceExecutor, prepared: RuntimePreparedSourceValue<TValue, TRead>) =>
      runtimeExecutor.retire(source, prepared),
    changeSetBaseRevision: changeSet?.baseRevision,
    snapshot: (
      requestedSource: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
      prepared: RuntimePreparedSourceValue<TValue, TRead>,
      revision: RuntimeRevision,
    ): RuntimeSnapshot<TRead> => {
      if (requestedSource !== source) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.SourceCommandInvalid,
          phase: 'snapshot',
          owner: requestedSource.key,
          cause: requestedSource,
        });
      }

      return Object.freeze({ revision, value: prepared.read });
    },
    changeSet: (
      requestedSource: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    ): RuntimeChangeSet<TChange> | undefined => {
      if (requestedSource !== source) {
        throw new RetikzRuntimeError({
          code: RetikzRuntimeErrorCode.SourceCommandInvalid,
          phase: 'change-set',
          owner: requestedSource.key,
          cause: requestedSource,
        });
      }

      return changeSet;
    },
  });
  return typedExecutor as unknown as RuntimeSourceCommandExecutor;
};

/** 在 concrete source 泛型仍可见时创建初始 Snapshot command */
export const createRuntimeSourceInput = <TInput, TValue, TRead, TChange>(
  source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
): RuntimeSourceInput => {
  const command = Object.freeze({ source, kind: 'initial' as const }) as unknown as RuntimeSourceInput;
  const executor = createRuntimeSourceCommandExecutor(source, value);
  runtimeSourceCommands.add(command);
  runtimeSourceCommandExecutors.set(command, executor);

  return command;
};

/** 在 concrete source 泛型仍可见时创建更新 Snapshot command */
export const createRuntimeSourceUpdate = <TInput, TValue, TRead, TChange>(
  source: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  value: TInput,
  changeSet?: RuntimeChangeSet<TChange>,
): RuntimeSourceUpdate => {
  if (changeSet !== undefined && !isRuntimeChangeSet(changeSet)) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.ChangeSetInvalid,
      phase: 'change-set',
      owner: source.key,
      cause: changeSet,
    });
  }

  const command = Object.freeze({ source, kind: 'update' as const }) as unknown as RuntimeSourceUpdate;
  const executor = createRuntimeSourceCommandExecutor(source, value, changeSet);
  runtimeSourceCommands.add(command);
  runtimeSourceCommandExecutors.set(command, executor);

  return command;
};

/** 读取 opaque source command 的私有执行入口 */
export const getRuntimeSourceCommandExecutor = (
  command: RuntimeSourceInput | RuntimeSourceUpdate,
): RuntimeSourceCommandExecutor => {
  if (!runtimeSourceCommands.has(command)) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.SourceCommandInvalid,
      phase: 'command',
      cause: command,
    });
  }

  const executor = runtimeSourceCommandExecutors.get(command);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'runtime source command: missing executor',
      phase: 'source-command',
      cause: command,
    });
  }

  return executor;
};
