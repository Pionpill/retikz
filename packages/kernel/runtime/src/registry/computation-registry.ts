import type {
  RuntimeComputationDefinition,
  RuntimeComputationErasedExecutor,
  RuntimeComputationToken,
} from '../computation';
import { getRuntimeComputationDefinitionExecutor, isRuntimeComputationDefinition } from '../computation';
import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import type { RuntimeComputationId } from '../identity';
import { isRuntimeSourceRegistry } from './source-registry';
import type { RuntimeSourceRegistry, RuntimeComputationRegistry, RuntimeComputationRegistryInput } from './types';

type RuntimeComputationRegistryState = Readonly<{
  sources: RuntimeSourceRegistry;
  executors: ReadonlyMap<RuntimeComputationToken, RuntimeComputationErasedExecutor>;
}>;

const runtimeComputationRegistries = new WeakMap<RuntimeComputationRegistry, RuntimeComputationRegistryState>();

/** 把结构化 Computation id 转成无碰撞 map key */
const idKey = (id: RuntimeComputationId): string => `${id.owner.length}:${id.owner}${id.key}`;

/** 按 Source/key 的 code-unit 顺序比较 Computation token */
const compareComputations = (left: RuntimeComputationToken, right: RuntimeComputationToken): number => {
  if (left.id.owner < right.id.owner) return -1;
  if (left.id.owner > right.id.owner) return 1;
  if (left.id.key < right.id.key) return -1;
  if (left.id.key > right.id.key) return 1;

  return 0;
};

type RuntimeComputationRegistryErrorCode =
  | typeof RetikzRuntimeErrorCode.ComputationDuplicate
  | typeof RetikzRuntimeErrorCode.ComputationUnknown
  | typeof RetikzRuntimeErrorCode.ComputationTokenInvalid
  | typeof RetikzRuntimeErrorCode.ComputationCycle
  | typeof RetikzRuntimeErrorCode.Unknown
  | typeof RetikzRuntimeErrorCode.RegistryMismatch;

/** 创建带 Computation context 的 registry contract 错误 */
const computationError = (
  code: RuntimeComputationRegistryErrorCode,
  computation: RuntimeComputationId | undefined,
  cause: unknown,
) => new RetikzRuntimeError({ code, phase: 'computation-registry', computation, cause });

/** 对 Computation graph 执行依赖优先且稳定的拓扑排序 */
export const sortRuntimeComputationGraph = (
  definitions: ReadonlyArray<RuntimeComputationToken>,
  dependenciesFor: (definition: RuntimeComputationToken) => ReadonlyArray<RuntimeComputationToken>,
): ReadonlyArray<RuntimeComputationToken> => {
  const indegrees = new Map(definitions.map(definition => [definition, 0]));
  const dependents = new Map(definitions.map(definition => [definition, new Set<RuntimeComputationToken>()]));
  const members = new Set(definitions);

  for (const definition of definitions) {
    const dependencies = dependenciesFor(definition);

    for (const dependency of dependencies) {
      if (!members.has(dependency)) {
        throw computationError(RetikzRuntimeErrorCode.ComputationUnknown, definition.id, dependency);
      }

      if (!dependents.get(dependency)?.has(definition)) {
        dependents.get(dependency)?.add(definition);
        indegrees.set(definition, (indegrees.get(definition) ?? 0) + 1);
      }
    }
  }

  const ready = definitions.filter(definition => indegrees.get(definition) === 0).sort(compareComputations);
  const sorted: Array<RuntimeComputationToken> = [];

  while (ready.length > 0) {
    const definition = ready.shift();
    if (definition === undefined) break;
    sorted.push(definition);

    for (const dependent of dependents.get(definition) ?? []) {
      const next = (indegrees.get(dependent) ?? 0) - 1;
      indegrees.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort(compareComputations);
      }
    }
  }

  if (sorted.length !== definitions.length) {
    throw computationError(RetikzRuntimeErrorCode.ComputationCycle, undefined, definitions);
  }

  return Object.freeze(sorted);
};

/** 注册 Computation Definitions 并验证 Source binding 与 DAG */
export const createRuntimeComputationRegistry = (
  input: RuntimeComputationRegistryInput,
): RuntimeComputationRegistry => {
  if (!isRuntimeSourceRegistry(input.sources)) {
    throw computationError(RetikzRuntimeErrorCode.RegistryMismatch, undefined, input.sources);
  }

  const computations = input.computations ?? [];

  const byId = new Map<string, RuntimeComputationToken>();
  const executors = new Map<RuntimeComputationToken, RuntimeComputationErasedExecutor>();

  for (const definition of computations) {
    if (!isRuntimeComputationDefinition(definition)) {
      throw computationError(RetikzRuntimeErrorCode.ComputationTokenInvalid, undefined, definition);
    }

    const key = idKey(definition.id);
    if (byId.has(key)) throw computationError(RetikzRuntimeErrorCode.ComputationDuplicate, definition.id, definition);

    const executor = getRuntimeComputationDefinitionExecutor(definition);
    if (input.sources.find(definition.id.owner) === undefined) {
      throw computationError(RetikzRuntimeErrorCode.Unknown, definition.id, definition.id.owner);
    }

    for (const owner of executor.sources) {
      if (input.sources.find(owner.key) !== owner) {
        throw computationError(RetikzRuntimeErrorCode.Unknown, definition.id, owner);
      }
    }

    byId.set(key, definition);
    executors.set(definition, executor);
  }

  const sorted = sortRuntimeComputationGraph(
    [...byId.values()],
    definition => executors.get(definition)?.computations ?? [],
  );
  const registry: RuntimeComputationRegistry = Object.freeze({
    resolve: <TResultInput, TResult, TComputationRead, TPublicRead>(
      definition: RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead>,
    ): RuntimeComputationDefinition<TResultInput, TResult, TComputationRead, TPublicRead> => {
      if (!isRuntimeComputationDefinition(definition)) {
        throw computationError(RetikzRuntimeErrorCode.ComputationTokenInvalid, undefined, definition);
      }

      if (byId.get(idKey(definition.id)) !== definition) {
        throw computationError(RetikzRuntimeErrorCode.ComputationUnknown, definition.id, definition);
      }

      return definition;
    },
    find: id => byId.get(idKey(id)),
    definitions: () => Object.freeze([...sorted]),
  });
  runtimeComputationRegistries.set(registry, Object.freeze({ sources: input.sources, executors }));

  return registry;
};

/** 读取 Computation registry 绑定的 Source registry identity */
export const getRuntimeComputationSourceRegistry = (registry: RuntimeComputationRegistry): RuntimeSourceRegistry => {
  const sources = runtimeComputationRegistries.get(registry)?.sources;
  if (sources === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'runtime Computation registry: missing source registry',
      phase: 'computation-registry',
      cause: registry,
    });
  }

  return sources;
};

/** 从具体 Computation registry 读取 token 对应的 erased executor */
export const getRuntimeComputationRegistryExecutor = (
  registry: RuntimeComputationRegistry,
  definition: RuntimeComputationToken,
): RuntimeComputationErasedExecutor => {
  if (!isRuntimeComputationDefinition(definition)) {
    throw computationError(RetikzRuntimeErrorCode.ComputationTokenInvalid, undefined, definition);
  }

  const executor = runtimeComputationRegistries.get(registry)?.executors.get(definition);
  if (executor === undefined)
    throw computationError(RetikzRuntimeErrorCode.ComputationUnknown, definition.id, definition);

  return executor;
};
