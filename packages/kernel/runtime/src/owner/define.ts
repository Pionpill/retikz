import type { RuntimeIdentity } from '../identity';
import type { RuntimeChangeSet, RuntimeOwnerDefinition, RuntimeOwnerDefinitionInput, RuntimeOwnerToken } from './types';

import { RuntimeOwnerRegistryError } from '../error';

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

/** 校验并复制 owner Definition 作者输入，隔离后续对象修改 */
const copyDefinitionInput = <TInput, TValue, TRead, TChange>(
  input: RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange>,
): RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange> => {
  const candidate: unknown = input;
  if (typeof candidate !== 'object' || candidate === null || !('key' in candidate) || !('value' in candidate)) {
    throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', '', candidate);
  }
  const owner = typeof candidate.key === 'string' ? candidate.key : '';
  if (owner.length === 0 || typeof candidate.value !== 'object' || candidate.value === null) {
    throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', owner, candidate);
  }
  const { capture, read, equals, dispose } = input.value;
  if (
    typeof capture !== 'function' ||
    typeof read !== 'function' ||
    typeof equals !== 'function' ||
    (dispose !== undefined && typeof dispose !== 'function') ||
    (input.collectIdentities !== undefined && typeof input.collectIdentities !== 'function') ||
    (input.validateChangeSet !== undefined && typeof input.validateChangeSet !== 'function')
  ) {
    throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', input.key, input);
  }
  return Object.freeze({
    key: input.key,
    value: Object.freeze({ capture, read, equals, dispose }),
    collectIdentities: input.collectIdentities,
    validateChangeSet: input.validateChangeSet,
  });
};

/** 创建不暴露 author callbacks 的 typed owner token */
export const defineRuntimeOwner = <TInput, TValue, TRead, TChange>(
  input: RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange>,
): RuntimeOwnerDefinition<TInput, TValue, TRead, TChange> => {
  const copied = copyDefinitionInput(input);
  const token = Object.freeze({ key: copied.key }) as RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>;
  const typedExecutor = Object.freeze({
    capture: (source: TInput): TValue => copied.value.capture(source),
    read: (value: TValue): TRead => copied.value.read(value),
    equals: (left: TValue, right: TValue): boolean => copied.value.equals(left, right),
    dispose: copied.value.dispose,
    collectIdentities: copied.collectIdentities,
    validateChangeSet: copied.validateChangeSet,
  });
  const erasedExecutor = typedExecutor as unknown as RuntimeOwnerErasedExecutor;
  runtimeOwnerTokens.add(token);
  runtimeOwnerExecutors.set(token, erasedExecutor);
  return token;
};

/** 判断一个动态值是否由当前 Runtime 实例的 define helper 创建 */
export const isRuntimeOwnerDefinition = (value: unknown): value is RuntimeOwnerToken =>
  typeof value === 'object' && value !== null && runtimeOwnerTokens.has(value);

/** 读取 define 时创建的 callback 擦除视图，仅供 registry 建立 token/executor 配对 */
export const getRuntimeOwnerDefinitionExecutor = (definition: RuntimeOwnerToken): RuntimeOwnerErasedExecutor => {
  if (!isRuntimeOwnerDefinition(definition)) {
    const candidate: unknown = definition;
    const owner =
      typeof candidate === 'object' && candidate !== null && 'key' in candidate && typeof candidate.key === 'string'
        ? candidate.key
        : '';
    throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', owner, definition);
  }
  const executor = runtimeOwnerExecutors.get(definition);
  if (executor === undefined) throw new Error(`runtime owner definition: missing executor for "${definition.key}"`);
  return executor;
};
