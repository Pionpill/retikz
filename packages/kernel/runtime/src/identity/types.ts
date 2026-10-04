/** 跨 revision 稳定的结构化 Runtime identity */
export type RuntimeIdentity = Readonly<{
  /** identity 所属领域 Source */
  owner: string;
  /** 不做规范化的非空路径段 */
  path: ReadonlyArray<string>;
}>;

/** Runtime Computation 的结构化 identity */
export type RuntimeComputationId = Readonly<{
  /** Computation 归属的领域 Source */
  owner: string;
  /** Source 内精确匹配的 Computation key */
  key: string;
}>;

/** 单个 Source 的 validated identity lookup */
export type RuntimeIdentityLookup = Readonly<{
  /** lookup 绑定的 Source */
  owner: string;
  /** identity 数量 */
  size: number;
  /** 按 segment exact equality 查询 identity */
  has: (identity: RuntimeIdentity) => boolean;
  /** 按 path code-unit 顺序返回 immutable copy */
  values: () => ReadonlyArray<RuntimeIdentity>;
}>;
