import type { RuntimeComputationDefinition, RuntimeComputationToken } from '../computation';
import type { RuntimeComputationId } from '../identity';
import type { RuntimeSourceDefinition, RuntimeSourceToken } from '../source';

/** 统一解析 typed Source token 的 immutable registry */
export type RuntimeSourceRegistry = Readonly<{
  /** 以原 Definition token 恢复完整泛型 */
  resolve: <TInput, TValue, TRead, TChange>(
    definition: RuntimeSourceDefinition<TInput, TValue, TRead, TChange>,
  ) => RuntimeSourceDefinition<TInput, TValue, TRead, TChange>;
  /** 动态 key lookup 只返回不含 callback 的 token */
  find: (key: string) => RuntimeSourceToken | undefined;
  /** 按 key code-unit 顺序返回 immutable token copy */
  definitions: () => ReadonlyArray<RuntimeSourceToken>;
}>;

/** Computation registry 的 Source binding 与 builtin/custom 输入 */
export type RuntimeComputationRegistryInput = Readonly<{
  /** Computation dependencies 必须来自的 Source registry */
  sources: RuntimeSourceRegistry;
  /** Kernel 内置 Computation Definitions */
  builtins?: ReadonlyArray<RuntimeComputationToken>;
  /** 第三方或上层 Computation Definitions */
  custom?: ReadonlyArray<RuntimeComputationToken>;
}>;

/** 统一解析 typed Computation token 并暴露稳定拓扑顺序的 registry */
export type RuntimeComputationRegistry = Readonly<{
  /** 以原 Definition token 恢复完整泛型 */
  resolve: <TArtifactInput, TArtifact, TComputationRead, TPublicRead>(
    definition: RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>,
  ) => RuntimeComputationDefinition<TArtifactInput, TArtifact, TComputationRead, TPublicRead>;
  /** 动态 identity lookup 只返回不含 callback 的 token */
  find: (id: RuntimeComputationId) => RuntimeComputationToken | undefined;
  /** 按依赖优先和 code-unit tie-break 返回 immutable token copy */
  definitions: () => ReadonlyArray<RuntimeComputationToken>;
}>;
