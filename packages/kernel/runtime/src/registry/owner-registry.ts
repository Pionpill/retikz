import type { RuntimeOwnerDefinition, RuntimeOwnerErasedExecutor, RuntimeOwnerToken } from '../owner';
import type { RuntimeOwnerRegistry, RuntimeOwnerRegistryInput } from './types';

import { RetikzRuntimeError, RetikzRuntimeErrorCode, RetikzRuntimeOwnerRegistryError } from '../error';
import { getRuntimeOwnerDefinitionExecutor, hasRuntimeOwnerToken } from '../owner';

const runtimeOwnerRegistryExecutors = new WeakMap<
  RuntimeOwnerRegistry,
  ReadonlyMap<RuntimeOwnerToken, RuntimeOwnerErasedExecutor>
>();
const runtimeOwnerRegistries = new WeakSet<object>();

const compareCodeUnits = (left: RuntimeOwnerToken, right: RuntimeOwnerToken): number => {
  if (left.key < right.key) return -1;
  if (left.key > right.key) return 1;
  return 0;
};

/** 判断动态值是否是当前 Runtime 实例创建的 owner registry */
export const isRuntimeOwnerRegistry = (value: unknown): value is RuntimeOwnerRegistry =>
  typeof value === 'object' && value !== null && runtimeOwnerRegistries.has(value);

/** 合并 builtin/custom Definition 并拒绝无效 token 与重复 key */
export const createRuntimeOwnerRegistry = (input: RuntimeOwnerRegistryInput): RuntimeOwnerRegistry => {
  const builtins = input.builtins ?? [];
  const custom = input.custom ?? [];
  const definitions = new Map<string, RuntimeOwnerToken>();
  const executors = new Map<RuntimeOwnerToken, RuntimeOwnerErasedExecutor>();
  for (const candidate of [...builtins, ...custom]) {
    if (!hasRuntimeOwnerToken(candidate)) {
      throw new RetikzRuntimeOwnerRegistryError(RetikzRuntimeErrorCode.TokenInvalid, candidate.key, candidate);
    }
    if (definitions.has(candidate.key)) {
      throw new RetikzRuntimeOwnerRegistryError(RetikzRuntimeErrorCode.Duplicate, candidate.key, candidate);
    }
    definitions.set(candidate.key, candidate);
    executors.set(candidate, getRuntimeOwnerDefinitionExecutor(candidate));
  }
  const sorted = Object.freeze([...definitions.values()].sort(compareCodeUnits));
  const registry: RuntimeOwnerRegistry = Object.freeze({
    resolve: <TInput, TValue, TRead, TChange>(
      definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    ): RuntimeOwnerDefinition<TInput, TValue, TRead, TChange> => {
      if (!hasRuntimeOwnerToken(definition)) {
        throw new RetikzRuntimeOwnerRegistryError(RetikzRuntimeErrorCode.TokenInvalid, definition.key, definition);
      }
      if (definitions.get(definition.key) !== definition) {
        throw new RetikzRuntimeOwnerRegistryError(RetikzRuntimeErrorCode.Unknown, definition.key, definition);
      }
      return definition;
    },
    find: key => definitions.get(key),
    definitions: () => Object.freeze([...sorted]),
  });
  runtimeOwnerRegistryExecutors.set(registry, executors);
  runtimeOwnerRegistries.add(registry);
  return registry;
};

/** 从具体 registry 读取与已注册 token 一一对应的 erased executor */
export const getRuntimeOwnerRegistryExecutor = (
  registry: RuntimeOwnerRegistry,
  definition: RuntimeOwnerToken,
): RuntimeOwnerErasedExecutor => {
  if (registry.find(definition.key) !== definition) {
    throw new RetikzRuntimeOwnerRegistryError(RetikzRuntimeErrorCode.Unknown, definition.key, definition);
  }
  const executor = runtimeOwnerRegistryExecutors.get(registry)?.get(definition);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: `runtime owner registry: missing executor for "${definition.key}"`,
      phase: 'owner-registry',
      cause: definition,
    });
  }
  return executor;
};
