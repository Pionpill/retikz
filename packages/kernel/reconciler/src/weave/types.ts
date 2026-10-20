import type { IRCoordinate, IRNode, IRPathBase, IRScope } from '@retikz/core';

/** 节点自身输入与有效继承上下文，不重复保存合并后的输入 */
export type WeaveInput<TInput, TContext> = {
  /** Core 定义的自身输入 */
  own: TInput;
  /** Core 负责解析的有效继承上下文 */
  scope: TContext;
};

/**
 * 节点的基础逻辑状态
 * @remarks 关联与集合描述模型，不提供候选隔离或原地修改已提交版本的许可
 */
type WeaveNodeBase<TInput, TContext, TUsage, TPending extends object> = {
  /** 所属声明容器 */
  parent: WeaveRoot<TContext, TUsage, TPending> | WeaveScopeNode<TContext, TUsage, TPending>;
  /** 已提交的组合输入 */
  input: WeaveInput<TInput, TContext>;
  /** Core 编译状态的暂定不透明类型，只允许持有与传递 */
  compiled: unknown;
  /** 待处理对象记录，条目语义与消费规则由更新机制确定 */
  pendingInputs: Array<TPending>;
  /** 依赖节点与本节点对其结果的读取需求 */
  dependencies: Map<WeaveNode<TContext, TUsage, TPending>, TUsage>;
  /** 消费本节点结果的节点，不重复保存读取需求 */
  consumers: Set<WeaveNode<TContext, TUsage, TPending>>;
};

/** 普通图元的 Weave 节点 */
export type WeaveShapeNode<TContext, TUsage, TPending extends object> = WeaveNodeBase<
  IRNode,
  TContext,
  TUsage,
  TPending
> & {
  /** 普通图元类别 */
  type: 'node';
};

/** 坐标的 Weave 节点 */
export type WeaveCoordinateNode<TContext, TUsage, TPending extends object> = WeaveNodeBase<
  IRCoordinate,
  TContext,
  TUsage,
  TPending
> & {
  /** 坐标类别 */
  type: 'coordinate';
};

/** 路径的 Weave 节点，路径步骤保留在自身输入中 */
export type WeavePathNode<TContext, TUsage, TPending extends object> = WeaveNodeBase<
  IRPathBase,
  TContext,
  TUsage,
  TPending
> & {
  /** 路径类别 */
  type: 'path';
};

/** Scope 的 Weave 节点，递归声明只由 children 保存 */
export type WeaveScopeNode<TContext, TUsage, TPending extends object> = WeaveNodeBase<
  Omit<IRScope, 'children'>,
  TContext,
  TUsage,
  TPending
> & {
  /** Scope 类别 */
  type: 'scope';
  /** 按声明顺序排列的子节点 */
  children: Array<WeaveNode<TContext, TUsage, TPending>>;
  /** 仅局部命名空间持有，key 为用户 id；普通 Scope 使用所属命名空间 */
  ids?: Map<string, WeaveNode<TContext, TUsage, TPending>>;
};

/**
 * 展开后的基础元素联合，不包含声明根与 Composite
 * @template TContext 有效继承上下文
 * @template TUsage 消费者记录的依赖读取需求
 * @template TPending 待处理的对象记录
 */
export type WeaveNode<TContext, TUsage, TPending extends object> =
  | WeaveCoordinateNode<TContext, TUsage, TPending>
  | WeavePathNode<TContext, TUsage, TPending>
  | WeaveScopeNode<TContext, TUsage, TPending>
  | WeaveShapeNode<TContext, TUsage, TPending>;

/** 声明根容器，不承担 Layout 计算职责 */
export type WeaveRoot<TContext, TUsage, TPending extends object> = {
  /** 根容器类别 */
  type: 'root';
  /** 根没有父节点 */
  parent: null;
  /** 按声明顺序排列的顶层节点 */
  children: Array<WeaveNode<TContext, TUsage, TPending>>;
  /** 根命名空间的用户 id 索引 */
  ids: Map<string, WeaveNode<TContext, TUsage, TPending>>;
};

/**
 * Weave 编译树的双版本逻辑入口
 * @remarks 两个引用本身不保证隔离；候选存储、发布与丢弃由更新机制实现
 */
export type WeaveTree<TContext, TUsage, TPending extends object> = {
  /** 已提交版本 */
  current: WeaveRoot<TContext, TUsage, TPending>;
  /** 本次候选版本，无更新时为空 */
  candidate: WeaveRoot<TContext, TUsage, TPending> | null;
};
