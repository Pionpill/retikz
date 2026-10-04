import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeIdentity } from '../identity';
import type {
  RuntimeChangeSet,
  RuntimeSourceDefinition,
  RuntimeSourceDefinitionInput,
  RuntimeSourceToken,
} from './types';

const runtimeSourceTokens = new WeakSet<object>();
const runtimeSourceExecutors = new WeakMap<object, RuntimeSourceErasedExecutor>();

/** registry 私有保存的 source callback 擦除视图 */
export type RuntimeSourceErasedExecutor = Readonly<{
  /** 捕获具体 Definition 的 runtime-owned value */
  capture: <TInput, TValue>(input: TInput) => TValue;
  /** 读取具体 Definition 的 immutable view */
  read: <TValue, TRead>(value: TValue) => TRead;
  /** 比较具体 Definition 的完整 captured value */
  equals: <TValue>(left: TValue, right: TValue) => boolean;
  /** 释放具体 Definition 捕获的 value */
  dispose?: <TValue>(value: TValue) => void;
  /** 收集具体 Definition 的结构化 identity */
  collectIdentities?: <TValue>(value: TValue) => ReadonlyArray<RuntimeIdentity>;
  /** 校验具体 Definition 的 change hint */
  validateChangeSet?: <TRead, TChange>(
    previous: TRead,
    next: TRead,
    changeSet: RuntimeChangeSet<TChange>,
  ) => 'valid' | 'fallback';
}>;

/** 创建不暴露 author callbacks 的 typed source token */
export const defineRuntimeSource = <TInput, TValue, TRead, TChange>(
  input: RuntimeSourceDefinitionInput<TInput, TValue, TRead, TChange>,
): RuntimeSourceDefinition<TInput, TValue, TRead, TChange> => {
  if (input.key.length === 0) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.TokenInvalid,
      phase: 'source-registry',
      message: `${RetikzRuntimeErrorCode.TokenInvalid}: invalid runtime source "${input.key}"`,
      owner: input.key,
      cause: input,
    });
  }
  const { capture, read, equals, dispose } = input.value;
  const token = Object.freeze({ key: input.key }) as RuntimeSourceDefinition<TInput, TValue, TRead, TChange>;
  const erasedExecutor = Object.freeze({
    capture: (source: TInput): TValue => capture(source),
    read: (value: TValue): TRead => read(value),
    equals: (left: TValue, right: TValue): boolean => equals(left, right),
    dispose,
    collectIdentities: input.collectIdentities,
    validateChangeSet: input.validateChangeSet,
  }) as RuntimeSourceErasedExecutor;
  runtimeSourceTokens.add(token);
  runtimeSourceExecutors.set(token, erasedExecutor);
  return token;
};

/** 判断对象是否由当前 Runtime 实例的 define helper 创建 */
export const hasRuntimeSourceToken = (value: object): boolean => runtimeSourceTokens.has(value);

/** 读取 define 时创建的 callback 擦除视图，仅供 registry 建立 token/executor 配对 */
export const getRuntimeSourceDefinitionExecutor = (definition: RuntimeSourceToken): RuntimeSourceErasedExecutor => {
  const executor = runtimeSourceExecutors.get(definition);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: `runtime source definition: missing executor for "${definition.key}"`,
      phase: 'source-definition',
      cause: definition,
    });
  }
  return executor;
};
