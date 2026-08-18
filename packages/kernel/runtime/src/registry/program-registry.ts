import type { RuntimeProgramId } from '../identity';
import type { RuntimeProgramDefinition, RuntimeProgramErasedExecutor, RuntimeProgramToken } from '../program';
import type { RuntimeOwnerRegistry, RuntimeProgramRegistry, RuntimeProgramRegistryInput } from './types';

import { RetikzRuntimeError, RetikzRuntimeErrorCode } from '../error';
import { getRuntimeProgramDefinitionExecutor, isRuntimeProgramDefinition } from '../program';
import { isRuntimeOwnerRegistry } from './owner-registry';

type RuntimeProgramRegistryState = Readonly<{
  owners: RuntimeOwnerRegistry;
  executors: ReadonlyMap<RuntimeProgramToken, RuntimeProgramErasedExecutor>;
}>;

const runtimeProgramRegistries = new WeakMap<RuntimeProgramRegistry, RuntimeProgramRegistryState>();

/** 把结构化 Program id 转成无碰撞 map key */
const idKey = (id: RuntimeProgramId): string => `${id.owner.length}:${id.owner}${id.key}`;

/** 按 owner/key 的 code-unit 顺序比较 Program token */
const comparePrograms = (left: RuntimeProgramToken, right: RuntimeProgramToken): number => {
  if (left.id.owner < right.id.owner) return -1;
  if (left.id.owner > right.id.owner) return 1;
  if (left.id.key < right.id.key) return -1;
  if (left.id.key > right.id.key) return 1;
  return 0;
};

type RuntimeProgramRegistryErrorCode =
  | typeof RetikzRuntimeErrorCode.ProgramDuplicate
  | typeof RetikzRuntimeErrorCode.ProgramUnknown
  | typeof RetikzRuntimeErrorCode.ProgramTokenInvalid
  | typeof RetikzRuntimeErrorCode.ProgramCycle
  | typeof RetikzRuntimeErrorCode.Unknown
  | typeof RetikzRuntimeErrorCode.RegistryMismatch;

/** 创建带 Program context 的 registry contract 错误 */
const programError = (code: RuntimeProgramRegistryErrorCode, program: RuntimeProgramId | undefined, cause: unknown) =>
  new RetikzRuntimeError({ code, phase: 'program-registry', program, cause });

/** 对 Program graph 执行依赖优先且稳定的拓扑排序 */
export const sortRuntimeProgramGraph = (
  definitions: ReadonlyArray<RuntimeProgramToken>,
  dependenciesFor: (definition: RuntimeProgramToken) => ReadonlyArray<RuntimeProgramToken>,
): ReadonlyArray<RuntimeProgramToken> => {
  const indegrees = new Map(definitions.map(definition => [definition, 0]));
  const dependents = new Map(definitions.map(definition => [definition, new Set<RuntimeProgramToken>()]));
  const members = new Set(definitions);
  for (const definition of definitions) {
    const dependencies = dependenciesFor(definition);
    for (const dependency of dependencies) {
      if (!members.has(dependency)) {
        throw programError(RetikzRuntimeErrorCode.ProgramUnknown, definition.id, dependency);
      }
      if (!dependents.get(dependency)?.has(definition)) {
        dependents.get(dependency)?.add(definition);
        indegrees.set(definition, (indegrees.get(definition) ?? 0) + 1);
      }
    }
  }

  const ready = definitions.filter(definition => indegrees.get(definition) === 0).sort(comparePrograms);
  const sorted: Array<RuntimeProgramToken> = [];
  while (ready.length > 0) {
    const definition = ready.shift();
    if (definition === undefined) break;
    sorted.push(definition);
    for (const dependent of dependents.get(definition) ?? []) {
      const next = (indegrees.get(dependent) ?? 0) - 1;
      indegrees.set(dependent, next);
      if (next === 0) {
        ready.push(dependent);
        ready.sort(comparePrograms);
      }
    }
  }
  if (sorted.length !== definitions.length) {
    throw programError(RetikzRuntimeErrorCode.ProgramCycle, undefined, definitions);
  }
  return Object.freeze(sorted);
};

/** 合并 builtin/custom Program Definitions 并验证 owner binding 与 DAG */
export const createRuntimeProgramRegistry = (input: RuntimeProgramRegistryInput): RuntimeProgramRegistry => {
  if (!isRuntimeOwnerRegistry(input.owners)) {
    throw programError(RetikzRuntimeErrorCode.RegistryMismatch, undefined, input.owners);
  }
  const builtins = input.builtins ?? [];
  const custom = input.custom ?? [];

  const byId = new Map<string, RuntimeProgramToken>();
  const executors = new Map<RuntimeProgramToken, RuntimeProgramErasedExecutor>();
  for (const definition of [...builtins, ...custom]) {
    if (!isRuntimeProgramDefinition(definition)) {
      throw programError(RetikzRuntimeErrorCode.ProgramTokenInvalid, undefined, definition);
    }
    const key = idKey(definition.id);
    if (byId.has(key)) throw programError(RetikzRuntimeErrorCode.ProgramDuplicate, definition.id, definition);
    const executor = getRuntimeProgramDefinitionExecutor(definition);
    if (input.owners.find(definition.id.owner) === undefined) {
      throw programError(RetikzRuntimeErrorCode.Unknown, definition.id, definition.id.owner);
    }
    for (const owner of executor.owners) {
      if (input.owners.find(owner.key) !== owner) {
        throw programError(RetikzRuntimeErrorCode.Unknown, definition.id, owner);
      }
    }
    byId.set(key, definition);
    executors.set(definition, executor);
  }
  const sorted = sortRuntimeProgramGraph([...byId.values()], definition => executors.get(definition)?.programs ?? []);
  const registry: RuntimeProgramRegistry = Object.freeze({
    resolve: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
      definition: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
    ): RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead> => {
      if (!isRuntimeProgramDefinition(definition)) {
        throw programError(RetikzRuntimeErrorCode.ProgramTokenInvalid, undefined, definition);
      }
      if (byId.get(idKey(definition.id)) !== definition) {
        throw programError(RetikzRuntimeErrorCode.ProgramUnknown, definition.id, definition);
      }
      return definition;
    },
    find: id => byId.get(idKey(id)),
    definitions: () => Object.freeze([...sorted]),
  });
  runtimeProgramRegistries.set(registry, Object.freeze({ owners: input.owners, executors }));
  return registry;
};

/** 读取 Program registry 绑定的 owner registry identity */
export const getRuntimeProgramOwnerRegistry = (registry: RuntimeProgramRegistry): RuntimeOwnerRegistry => {
  const owners = runtimeProgramRegistries.get(registry)?.owners;
  if (owners === undefined) {
    throw new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.InternalInvariant,
      message: 'runtime Program registry: missing owner registry',
      phase: 'program-registry',
      cause: registry,
    });
  }
  return owners;
};

/** 从具体 Program registry 读取 token 对应的 erased executor */
export const getRuntimeProgramRegistryExecutor = (
  registry: RuntimeProgramRegistry,
  definition: RuntimeProgramToken,
): RuntimeProgramErasedExecutor => {
  if (!isRuntimeProgramDefinition(definition)) {
    throw programError(RetikzRuntimeErrorCode.ProgramTokenInvalid, undefined, definition);
  }
  const executor = runtimeProgramRegistries.get(registry)?.executors.get(definition);
  if (executor === undefined) throw programError(RetikzRuntimeErrorCode.ProgramUnknown, definition.id, definition);
  return executor;
};
