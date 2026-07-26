import type { RuntimeProgramId } from '../identity';
import type { RuntimeOwnerDefinition, RuntimeOwnerToken } from '../owner';
import type { RuntimeProgramDefinition, RuntimeProgramToken } from '../program';

/** owner registry 的 builtin/custom Definition 输入 */
export type RuntimeOwnerRegistryInput = Readonly<{
  /** Kernel 内置 owner Definitions */
  builtins?: ReadonlyArray<RuntimeOwnerToken>;
  /** 第三方或上层 owner Definitions */
  custom?: ReadonlyArray<RuntimeOwnerToken>;
}>;

/** 统一解析 builtin/custom typed owner token 的 immutable registry */
export type RuntimeOwnerRegistry = Readonly<{
  /** 以原 Definition token 恢复完整泛型 */
  resolve: <TInput, TValue, TRead, TChange>(
    definition: RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeOwnerDefinition<TInput, TValue, TRead, TChange>;
  /** 动态 key lookup 只返回不含 callback 的 token */
  find: (key: string) => RuntimeOwnerToken | undefined;
  /** 按 key code-unit 顺序返回 immutable token copy */
  definitions: () => ReadonlyArray<RuntimeOwnerToken>;
}>;

/** Program registry 的 owner binding 与 builtin/custom 输入 */
export type RuntimeProgramRegistryInput = Readonly<{
  /** Program dependencies 必须来自的 owner registry */
  owners: RuntimeOwnerRegistry;
  /** Kernel 内置 Program Definitions */
  builtins?: ReadonlyArray<RuntimeProgramToken>;
  /** 第三方或上层 Program Definitions */
  custom?: ReadonlyArray<RuntimeProgramToken>;
}>;

/** 统一解析 typed Program token 并暴露稳定拓扑顺序的 registry */
export type RuntimeProgramRegistry = Readonly<{
  /** 以原 Definition token 恢复完整泛型 */
  resolve: <TArtifactInput, TArtifact, TProgramRead, TPublicRead>(
    definition: RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>,
  ) => RuntimeProgramDefinition<TArtifactInput, TArtifact, TProgramRead, TPublicRead>;
  /** 动态 identity lookup 只返回不含 callback 的 token */
  find: (id: RuntimeProgramId) => RuntimeProgramToken | undefined;
  /** 按依赖优先和 code-unit tie-break 返回 immutable token copy */
  definitions: () => ReadonlyArray<RuntimeProgramToken>;
}>;
