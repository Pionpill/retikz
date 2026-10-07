import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeSourceDefinition, RuntimeSourceErasedExecutor, RuntimeSourceToken } from '../source';
import { getRuntimeSourceDefinitionExecutor, hasRuntimeSourceToken } from '../source';
import type { RuntimeSourceRegistry } from './types';

const runtimeSourceRegistryExecutors = new WeakMap<
  RuntimeSourceRegistry,
  ReadonlyMap<RuntimeSourceToken, RuntimeSourceErasedExecutor>
>();

const runtimeSourceRegistries = new WeakSet<object>();

const compareCodeUnits = (left: RuntimeSourceToken, right: RuntimeSourceToken): number => {
  if (left.key < right.key) return -1;
  if (left.key > right.key) return 1;
  return 0;
};

/** 创建 source registry contract 错误 */
const sourceRegistryError = (
  code:
    | typeof RetikzRuntimeErrorCode.Duplicate
    | typeof RetikzRuntimeErrorCode.Unknown
    | typeof RetikzRuntimeErrorCode.TokenInvalid,
  source: string,
  cause?: unknown,
): RetikzRuntimeError =>
  new RetikzRuntimeError({
    code,
    phase: 'source-registry',
    message: `${code}: invalid runtime source "${source}"`,
    owner: source,
    cause,
  });

/** 判断动态值是否是当前 Runtime 实例创建的 source registry */
export const isRuntimeSourceRegistry = (value: unknown): value is RuntimeSourceRegistry =>
  typeof value === 'object' && value !== null && runtimeSourceRegistries.has(value);

/**
 * 注册来源 token，并拒绝无效 token 与重复 key
 * @param tokens 待注册的来源凭证；空数组建立空注册表
 * @returns 冻结的来源注册表，保留原始凭证身份
 * @throws {RetikzRuntimeError} 凭证不是由 defineRuntimeSource 创建或来源键重复时抛出
 */
export const createRuntimeSourceRegistry = (tokens: Array<RuntimeSourceToken>): RuntimeSourceRegistry => {
  const definitions = new Map<string, RuntimeSourceToken>();
  const executors = new Map<RuntimeSourceToken, RuntimeSourceErasedExecutor>();

  for (const candidate of tokens) {
    if (!hasRuntimeSourceToken(candidate)) {
      throw sourceRegistryError(RetikzRuntimeErrorCode.TokenInvalid, candidate.key, candidate);
    }

    if (definitions.has(candidate.key)) {
      throw sourceRegistryError(RetikzRuntimeErrorCode.Duplicate, candidate.key, candidate);
    }

    definitions.set(candidate.key, candidate);
    executors.set(candidate, getRuntimeSourceDefinitionExecutor(candidate));
  }

  const sorted = Object.freeze([...definitions.values()].sort(compareCodeUnits));
  const registry: RuntimeSourceRegistry = Object.freeze({
    resolve: <TInput, TValue, TRead, TChange>(
      definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
    ): RuntimeSourceDefinition<TInput, TValue, TRead, TChange> => {
      if (!hasRuntimeSourceToken(definition)) {
        throw sourceRegistryError(RetikzRuntimeErrorCode.TokenInvalid, definition.key, definition);
      }

      if (definitions.get(definition.key) !== definition) {
        throw sourceRegistryError(RetikzRuntimeErrorCode.Unknown, definition.key, definition);
      }

      return definition;
    },
    find: key => definitions.get(key),
    definitions: () => Object.freeze([...sorted]),
  });
  runtimeSourceRegistryExecutors.set(registry, executors);
  runtimeSourceRegistries.add(registry);

  return registry;
};

/** 从具体 registry 读取与已注册 token 一一对应的 erased executor */
export const getRuntimeSourceRegistryExecutor = (
  registry: RuntimeSourceRegistry,
  definition: RuntimeSourceToken,
): RuntimeSourceErasedExecutor => {
  if (registry.find(definition.key) !== definition) {
    throw sourceRegistryError(RetikzRuntimeErrorCode.Unknown, definition.key, definition);
  }

  const executor = runtimeSourceRegistryExecutors.get(registry)?.get(definition);
  if (executor === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: `runtime source registry: missing executor for "${definition.key}"`,
      phase: 'source-registry',
      cause: definition,
    });
  }

  return executor;
};
