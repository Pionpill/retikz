import type {
  CompileEnvironment,
  CompileRead,
  CompileWarning,
  CompiledNode,
  CompiledCoordinate,
  CompiledPath,
  CompiledScope,
  ElementCompileContext,
  IRCoordinate,
  IRNode,
  IRPathBase,
  IRScope,
  IRScene,
} from '@retikz/core';

import type { WeaveChangeKind, WeaveChangeSource } from './constants';

/**
 * 依赖读取需求的占位值，不表示无依赖
 * TODO: 明确 layout / style 等分类后接入读取需求与变化匹配算法
 * 分类前传播一律使消费者失效，不根据此值过滤更新；完整读取事实保留在 records
 */
export type WeaveDependencyKind = null;

/** 节点自身输入与有效继承上下文，不重复保存合并后的输入 */
export type WeaveInput<TInput> = {
  /** Core 定义的自身输入 */
  own: TInput;
  /** Core 负责解析的有效继承上下文 */
  context: ElementCompileContext;
};

/** 节点的可替换逻辑状态，集合写入由候选工作区隔离 */
type WeaveNodeStateBase<TInput> = {
  /** 所属声明容器，引用稳定对象 */
  parent: WeaveRoot | WeaveScopeNode;
  /** 自身输入与有效上下文，替换对象而非修改共享内容 */
  input: Readonly<WeaveInput<TInput>>;
  /** 本批待处理变化 */
  pendingInputs: ReadonlyArray<Readonly<WeavePendingInput>>;
  /** 依赖与读取粒度，值也保持只读 */
  dependencies: ReadonlyMap<WeaveNode, ReadonlyArray<WeaveDependencyKind>>;
  /** 反向消费者 */
  consumers: ReadonlySet<WeaveNode>;
};

/** 普通图元状态 */
export type WeaveShapeState = WeaveNodeStateBase<IRNode> & {
  /** Core 完整编译产物，只读复用 */
  compiled: CompiledNode | null;
};

/** 坐标状态 */
export type WeaveCoordinateState = WeaveNodeStateBase<IRCoordinate> & {
  /** Core 完整编译产物，只读复用 */
  compiled: CompiledCoordinate | null;
};

/** 路径状态 */
export type WeavePathState = WeaveNodeStateBase<IRPathBase> & {
  /** Core 完整编译产物，只读复用 */
  compiled: CompiledPath | null;
};

/** Scope 状态，自身输入不重复保存 children */
export type WeaveScopeState = WeaveNodeStateBase<Omit<IRScope, 'children'>> & {
  /** Core 完整编译产物，只读复用 */
  compiled: CompiledScope | null;
  /** 有序子节点，子节点状态变化不改变此数组 */
  children: ReadonlyArray<WeaveNode>;
  /** 仅局部命名空间持有的用户 id 索引 */
  ids?: ReadonlyMap<string, WeaveNode>;
};

/** 稳定对象上的两个状态槽，首次提交前 current 为 null */
type WeaveNodeVersions<TState> = {
  /** 已提交状态，不得原地修改 */
  current: TState | null;
  /** 候选状态，无候选时为 null */
  pending: TState | null;
};

/** 稳定普通图元引用 */
export type WeaveShapeNode = WeaveNodeVersions<WeaveShapeState> & {
  /** 不随状态变化的类别 */
  readonly type: 'node';
};

/** 稳定坐标引用 */
export type WeaveCoordinateNode = WeaveNodeVersions<WeaveCoordinateState> & {
  /** 不随状态变化的类别 */
  readonly type: 'coordinate';
};

/** 稳定路径引用 */
export type WeavePathNode = WeaveNodeVersions<WeavePathState> & {
  /** 不随状态变化的类别 */
  readonly type: 'path';
};

/** 稳定 Scope 引用 */
export type WeaveScopeNode = WeaveNodeVersions<WeaveScopeState> & {
  /** 不随状态变化的类别 */
  readonly type: 'scope';
  /** 树内唯一且在容器生命周期内稳定的定位地址 */
  readonly scopeId: string;
};

/** 基础元素联合，不包含 Composite 或声明根 */
export type WeaveNode = WeaveCoordinateNode | WeavePathNode | WeaveScopeNode | WeaveShapeNode;

/** 根状态，集合、记录与输入随候选隔离 */
export type WeaveRootState = {
  /** 根没有父节点 */
  parent: null;
  /** Scene 自身输入 */
  input: Omit<IRScene, 'children'>;
  /** 有序顶层节点 */
  children: ReadonlyArray<WeaveNode>;
  /** Core 只读环境 */
  environment: CompileEnvironment;
  /** 用户 id 索引 */
  ids: ReadonlyMap<string, WeaveNode>;
  /** 根自身及所有 Scope 的定位索引 */
  scopeIds: ReadonlyMap<string, WeaveRoot | WeaveScopeNode>;
  /** 元素读取事实及诊断，替换记录而非修改共享值 */
  records: ReadonlyMap<
    WeaveNode,
    Readonly<{
      reads: ReadonlyArray<CompileRead>;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  >;
};

/** 稳定声明根，不承担 Layout 计算 */
export type WeaveRoot = WeaveNodeVersions<WeaveRootState> & {
  /** 根类别 */
  readonly type: 'root';
  /** 根定位地址 */
  readonly scopeId: string;
};

/** 基础元素的完整自身输入，Scope 不包含声明子树 */
export type WeaveOwnInput = IRNode | IRCoordinate | IRPathBase | Omit<IRScope, 'children'>;

/** 可插入的基础元素声明，递归子树不包含 Composite */
export type WeaveElementInput =
  | IRNode
  | IRCoordinate
  | IRPathBase
  | (Omit<IRScope, 'children'> & {
      /** 按声明顺序排列的基础元素 */
      children: Array<WeaveElementInput>;
    });

/** 通过树内唯一 id 定位 Scope 自身 */
export type WeaveScopeTarget = {
  /** Scope 自身定位 */
  kind: 'scope';
  /** Scope 定位 id */
  scopeId: string;
};

/** 在指定容器的命名空间上下文中查找用户 id */
export type WeaveIdTarget = {
  /** 用户 id 定位 */
  kind: 'id';
  /** Scope 或 root 的容器定位 id */
  scopeId: string;
  /** 用户绘图 id */
  id: string;
};

/** 按容器直接 children 中的位置定位 */
export type WeaveChildTarget = {
  /** 直接子元素定位 */
  kind: 'child';
  /** Scope 或 root 的容器定位 id */
  scopeId: string;
  /** 候选结构中的直接子元素下标，不是跨版本稳定身份 */
  index: number;
};

/** 更新目标地址，位置地址按前序操作形成的候选结构解释 */
export type WeaveTarget = WeaveScopeTarget | WeaveIdTarget | WeaveChildTarget;

/** 在候选容器中按数组顺序连续插入基础元素或 Scope 子树 */
export type WeaveInsertOperation = {
  /** 插入操作 */
  kind: 'insert';
  /** Scope 或 root 的容器定位 id */
  parentId: string;
  /** 插入前的位置，等于 children 长度时追加 */
  index: number;
  /** 按顺序插入的完整声明，空数组不产生修改 */
  elements: Array<WeaveElementInput>;
};

/** 完整替换已有元素自身输入，不改变类别或 Scope children */
export type WeaveUpdateOperation = {
  /** 修改操作 */
  kind: 'update';
  /** 已有元素的地址 */
  target: WeaveTarget;
  /** 类别必须与目标一致，省略旧覆盖字段表示移除覆盖 */
  input: WeaveOwnInput;
};

/** 删除元素；Scope 连同其声明子树删除 */
export type WeaveRemoveOperation = {
  /** 删除操作 */
  kind: 'remove';
  /** 待删除元素的地址 */
  target: WeaveTarget;
};

/** 显式声明的基础增删改操作 */
export type WeaveOperation = WeaveInsertOperation | WeaveUpdateOperation | WeaveRemoveOperation;

/** 顺序应用输入、统一计算与提交的一批操作 */
export type WeaveBatch = {
  /** 后续操作读取前序操作形成的候选结构 */
  operations: Array<WeaveOperation>;
};

/** 节点待处理变化，影响范围去重不代表依赖已就绪 */
export type WeavePendingInput =
  | {
      /** 自身输入变化 */
      source: typeof WeaveChangeSource.Own;
      /** 可能受影响的计算范围 */
      changes: ReadonlySet<WeaveChangeKind>;
    }
  | {
      /** 有效继承上下文变化 */
      source: typeof WeaveChangeSource.Context;
      /** 可能受影响的计算范围 */
      changes: ReadonlySet<WeaveChangeKind>;
    }
  | {
      /** 读取的依赖结果变化 */
      source: typeof WeaveChangeSource.Dependency;
      /** 与消费者按相同候选版本解析的生产节点 */
      producer: WeaveNode;
      /** 依赖结果变化可能影响的计算范围 */
      changes: ReadonlySet<WeaveChangeKind>;
    };
