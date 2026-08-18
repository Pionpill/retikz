import type { RuntimeIdentity } from '../identity';
import type { RuntimeChangeSet, RuntimeOwnerDefinition, RuntimeOwnerDefinitionInput, RuntimeOwnerToken } from './types';

import { RetikzRuntimeError, RetikzRuntimeErrorCode, RetikzRuntimeOwnerRegistryError } from '../error';

const runtimeOwnerTokens = new WeakSet<object>();
const runtimeOwnerExecutors = new WeakMap<object, RuntimeOwnerErasedExecutor>();

/** registry 私有保存的 owner callback 擦除视图 */
export type RuntimeOwnerErasedExecutor = Readonly<{
  /** 捕获具体 Definition 的 session-owned value */
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

/** 创建不暴露 author callbacks 的 typed owner token */
export const defineRuntimeOwner = <TInput, TValue, TRead, TChange>(
  input: RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange>,
): RuntimeOwnerDefinition<TInput, TValue, TRead, TChange> => {
  if (input.key.length === 0) {
    throw new RetikzRuntimeOwnerRegistryError(RetikzRuntimeErrorCode.TokenInvalid, input.key, input);
  }
  const { capture, read, equals, dispose } = input.value;
  const token = Object.freeze({ key: input.key }) as RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>;
  const erasedExecutor = Object.freeze({
    capture: (source: TInput): TValue => capture(source),
    read: (value: TValue): TRead => read(value),
    equals: (left: TValue, right: TValue): boolean => equals(left, right),
    dispose,
    collectIdentities: input.collectIdentities,
    validateChangeSet: input.validateChangeSet,
  }) as RuntimeOwnerErasedExecutor;
  runtimeOwnerTokens.add(token);
  runtimeOwnerExecutors.set(token, erasedExecutor);
  return token;
};

/** 判断对象是否由当前 Runtime 实例的 define helper 创建 */
export const hasRuntimeOwnerToken = (value: object): boolean => runtimeOwnerTokens.has(value);

/** 读取 define 时创建的 callback 擦除视图，仅供 registry 建立 token/executor 配对 */
export const getRuntimeOwnerDefinitionExecutor = (definition: RuntimeOwnerToken): RuntimeOwnerErasedExecutor => {
  const executor = runtimeOwnerExecutors.get(definition);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: `runtime owner definition: missing executor for "${definition.key}"`,
      phase: 'owner-definition',
      cause: definition,
    });
  }
  return executor;
};
