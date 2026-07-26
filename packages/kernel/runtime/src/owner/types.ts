import type { RuntimeIdentity } from '../identity';

declare const RuntimeRevisionType: unique symbol;
declare const RuntimeChangeSetType: unique symbol;
declare const RuntimeOwnerTokenBrand: unique symbol;
declare const RuntimeOwnerType: unique symbol;

/** 单调递增且不超过 safe integer 的 Runtime revision */
export type RuntimeRevision = number & Readonly<{ [RuntimeRevisionType]: true }>;

/** 绑定 base revision 的领域 change hint */
export type RuntimeChangeSet<TChange> = Readonly<{
  /** change hint 对应的 current revision */
  baseRevision: RuntimeRevision;
  /** 领域 change 列表 */
  changes: ReadonlyArray<TChange>;
  /** 由 Runtime factory 添加的 opaque brand */
  [RuntimeChangeSetType]: true;
}>;

/** owner value 的 capture、read、semantic equality 与释放契约 */
export type RuntimeOwnedValueDefinitionInput<TInput, TValue, TRead> = Readonly<{
  /** 从完整输入捕获 session-owned value */
  capture: (input: TInput) => TValue;
  /** 产生不携带 disposable handle 的 immutable read view */
  read: (value: TValue) => TRead;
  /** 比较两个完整 captured value 的语义等价性 */
  equals: (left: TValue, right: TValue) => boolean;
  /** 释放未发布或已替换的 captured value */
  dispose?: (value: TValue) => void;
}>;

/** Runtime owner Definition 的作者侧输入 */
export type RuntimeOwnerDefinitionInput<TInput, TValue, TRead, TChange> = Readonly<{
  /** 全局精确匹配的非空 owner key */
  key: string;
  /** owner value 的完整 Snapshot lifecycle */
  value: RuntimeOwnedValueDefinitionInput<TInput, TValue, TRead>;
  /** 从 captured value 收集该 owner 的完整 identity 集合 */
  collectIdentities?: (value: TValue) => ReadonlyArray<RuntimeIdentity>;
  /** 校验 change hint 是否可用于 previous → next */
  validateChangeSet?: (previous: TRead, next: TRead, changeSet: RuntimeChangeSet<TChange>) => 'valid' | 'fallback';
}>;

/** 动态 registry lookup 只暴露的 opaque owner token */
export type RuntimeOwnerToken = Readonly<{
  /** owner key */
  key: string;
  /** 只允许 defineRuntimeOwner() 构造 token */
  [RuntimeOwnerTokenBrand]: true;
}>;

/** 保留 input/value/read/change 泛型的 typed owner token */
export type RuntimeOwnerDefinition<TInput, TValue, TRead, TChange> = RuntimeOwnerToken &
  Readonly<{
    /** phantom 函数只承载泛型关系，不存在于运行时 token */
    [RuntimeOwnerType]: (input: TInput, value: TValue, read: TRead, change: TChange) => void;
  }>;
