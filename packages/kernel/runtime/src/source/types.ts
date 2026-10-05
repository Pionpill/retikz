import type { RuntimeIdentity } from '../identity';

declare const RuntimeRevisionType: unique symbol;

declare const RuntimeChangeSetType: unique symbol;

declare const RuntimeSourceTokenBrand: unique symbol;

declare const RuntimeSourceType: unique symbol;

/** 单调递增且不超过 safe integer 的 Runtime revision */
export type RuntimeRevision = number & Readonly<{ [RuntimeRevisionType]: true }>;

/**
 * 绑定 base revision 的领域 change hint
 * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
 */
export type RuntimeChangeSet<TChange> = Readonly<{
  /** change hint 对应的 current revision */
  baseRevision: RuntimeRevision;
  /** 领域 change 列表 */
  changes: ReadonlyArray<TChange>;
  /** 由 Runtime factory 添加的 opaque brand */
  [RuntimeChangeSetType]: true;
}>;

/**
 * source value 的 capture、read、semantic equality 与释放契约
 * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
 * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
 * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
 */
export type RuntimeSourceValueDefinitionInput<TInput, TValue, TRead> = Readonly<{
  /** 从完整输入捕获 runtime-owned value */
  capture: (input: TInput) => TValue;
  /** 产生不携带 disposable handle 的 immutable read view */
  read: (value: TValue) => TRead;
  /** 比较两个完整 captured value 的语义等价性 */
  equals: (left: TValue, right: TValue) => boolean;
  /** 释放未发布或已替换的 captured value */
  dispose?: (value: TValue) => void;
}>;

/**
 * Runtime source Definition 的作者侧输入
 * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
 * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
 * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
 * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
 */
export type RuntimeSourceDefinitionInput<TInput, TValue, TRead, TChange> = Readonly<{
  /** 全局精确匹配的非空 source key */
  key: string;
  /** source value 的完整 Snapshot lifecycle */
  value: RuntimeSourceValueDefinitionInput<TInput, TValue, TRead>;
  /** 从 captured value 收集该 source 的完整 identity 集合 */
  collectIdentities?: (value: TValue) => ReadonlyArray<RuntimeIdentity>;
  /** 校验 change hint 是否可用于 previous → next */
  validateChangeSet?: (previous: TRead, next: TRead, changeSet: RuntimeChangeSet<TChange>) => 'valid' | 'fallback';
}>;

/** 动态 registry lookup 只暴露的 opaque source token */
export type RuntimeSourceToken = Readonly<{
  /** 数据源的注册键 */
  key: string;
  /** 只允许 defineRuntimeSource() 构造 token */
  [RuntimeSourceTokenBrand]: true;
}>;

/**
 * 保留 input/value/read/change 泛型的 typed source token
 * @template TInput Source 接收的完整作者输入，由 capture 转为运行时持有值
 * @template TValue Source 经 capture 产生并由运行时持有、比较和释放的值
 * @template TRead Source 的只读视图类型，由 read 从持有值生成并通过快照暴露
 * @template TChange 领域变更提示的单项类型，由 Source 校验并供增量计算消费
 */
export type RuntimeSourceDefinition<TInput, TValue, TRead, TChange> = RuntimeSourceToken &
  Readonly<{
    /** phantom 函数只承载泛型关系，不存在于运行时 token */
    [RuntimeSourceType]: (input: TInput, value: TValue, read: TRead, change: TChange) => void;
  }>;
