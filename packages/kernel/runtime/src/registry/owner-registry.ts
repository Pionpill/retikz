import type { RuntimeOwnerDefinition, RuntimeOwnerErasedExecutor, RuntimeOwnerToken } from '../owner';
import type { RuntimeOwnerRegistry, RuntimeOwnerRegistryInput } from './types';

import { RuntimeOwnerRegistryError } from '../error';
import { getRuntimeOwnerDefinitionExecutor, isRuntimeOwnerDefinition } from '../owner';

const runtimeOwnerRegistryExecutors = new WeakMap<
  RuntimeOwnerRegistry,
  ReadonlyMap<RuntimeOwnerToken, RuntimeOwnerErasedExecutor>
>();

const readOwnerKey = (value: unknown): string => {
  if (typeof value !== 'object' || value === null || !('key' in value)) return '';
  return typeof value.key === 'string' ? value.key : '';
};

const compareCodeUnits = (left: RuntimeOwnerToken, right: RuntimeOwnerToken): number => {
  if (left.key < right.key) return -1;
  if (left.key > right.key) return 1;
  return 0;
};

/** 合并 builtin/custom Definition 并拒绝无效 token 与重复 key */
export const createRuntimeOwnerRegistry = (input: RuntimeOwnerRegistryInput): RuntimeOwnerRegistry => {
  const registryInputCandidate: unknown = input;
  if (typeof registryInputCandidate !== 'object' || registryInputCandidate === null) {
    throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', '', registryInputCandidate);
  }
  const builtins = input.builtins ?? [];
  const custom = input.custom ?? [];
  if (!Array.isArray(builtins) || !Array.isArray(custom)) {
    throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', '', input);
  }
  const definitions = new Map<string, RuntimeOwnerToken>();
  const executors = new Map<RuntimeOwnerToken, RuntimeOwnerErasedExecutor>();
  for (const candidate of [...builtins, ...custom]) {
    if (!isRuntimeOwnerDefinition(candidate)) {
      throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', readOwnerKey(candidate), candidate);
    }
    if (definitions.has(candidate.key)) {
      throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_DUPLICATE', candidate.key, candidate);
    }
    definitions.set(candidate.key, candidate);
    executors.set(candidate, getRuntimeOwnerDefinitionExecutor(candidate));
  }
  const sorted = Object.freeze([...definitions.values()].sort(compareCodeUnits));
  const registry: RuntimeOwnerRegistry = Object.freeze({
    resolve: <TInput, TValue, TRead, TChange>(
      definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
    ): RuntimeOwnerDefinition<TInput, TValue, TRead, TChange> => {
      if (!isRuntimeOwnerDefinition(definition)) {
        throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_TOKEN_INVALID', readOwnerKey(definition), definition);
      }
      if (definitions.get(definition.key) !== definition) {
        throw new RuntimeOwnerRegistryError('RUNTIME_OWNER_UNKNOWN', definition.key, definition);
      }
      return definition;
    },
    find: key => definitions.get(key),
    definitions: () => Object.freeze([...sorted]),
  });
  runtimeOwnerRegistryExecutors.set(registry, executors);
  return registry;
};

/** 从具体 registry 读取与已注册 token 一一对应的 erased executor */
export const getRuntimeOwnerRegistryExecutor = <TInput, TValue, TRead, TChange>(
  registry: RuntimeOwnerRegistry,
  definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
): RuntimeOwnerErasedExecutor => {
  const resolved = registry.resolve(definition);
  const executor = runtimeOwnerRegistryExecutors.get(registry)?.get(resolved);
  if (executor === undefined) throw new Error(`runtime owner registry: missing executor for "${definition.key}"`);
  return executor;
};
