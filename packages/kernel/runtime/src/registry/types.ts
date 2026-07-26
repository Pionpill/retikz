import type { RuntimeOwnerDefinition, RuntimeOwnerToken } from '../owner';

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
