/** 跨 revision 稳定的结构化 Runtime identity */
export type RuntimeIdentity = Readonly<{
  /** identity 所属领域 owner */
  owner: string;
  /** 不做规范化的非空路径段 */
  path: ReadonlyArray<string>;
}>;

/** Runtime Program 的结构化 identity */
export type RuntimeProgramId = Readonly<{
  /** Program 归属的领域 owner */
  owner: string;
  /** owner 内精确匹配的 Program key */
  key: string;
}>;

/** 单个 owner 的 validated identity index */
export type RuntimeIdentityIndex = Readonly<{
  /** index 绑定的 owner */
  owner: string;
  /** identity 数量 */
  size: number;
  /** 按 segment exact equality 查询 identity */
  has: (identity: RuntimeIdentity) => boolean;
  /** 按 path code-unit 顺序返回 immutable copy */
  values: () => ReadonlyArray<RuntimeIdentity>;
}>;
