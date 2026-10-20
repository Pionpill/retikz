import type {
  CompileEnvironment,
  CompiledNode,
  CompiledCoordinate,
  CompiledPath,
  CompiledScope,
  ElementCompileContext,
  IRCoordinate,
  IRNode,
  IRPathBase,
  IRScope,
} from '@retikz/core';

import type { WeaveChangeKind, WeaveChangeSource } from './constants';

/** 节点自身输入与有效继承上下文，不重复保存合并后的输入 */
export type WeaveInput<TInput> = {
  /** Core 定义的自身输入 */
  own: TInput;
  /** Core 负责解析的有效继承上下文 */
  scope: ElementCompileContext;
};

/**
 * 节点的基础逻辑状态
 * @remarks 每个节点对象属于一个树版本，候选计算不得修改已提交版本的可达状态
 */
type WeaveNodeBase<TInput, TUsage> = {
  /** 所属声明容器 */
  parent: WeaveRoot<TUsage> | WeaveScopeNode<TUsage>;
  /** 当前组合输入 */
  input: WeaveInput<TInput>;
  /** 归集自身、上下文与依赖变化，不重复保存完整输入 */
  pendingInputs: Array<WeavePendingInput<TUsage>>;
  /** 依赖节点与本节点对其结果的读取需求 */
  dependencies: Map<WeaveNode<TUsage>, TUsage>;
  /** 消费本节点结果的节点，不重复保存读取需求 */
  consumers: Set<WeaveNode<TUsage>>;
};

/** 普通图元的 Weave 节点 */
export type WeaveShapeNode<TUsage> = WeaveNodeBase<IRNode, TUsage> & {
  /** 普通图元类别 */
  type: 'node';
  /** Core 定义的完整编译状态，候选计算只读消费旧状态 */
  compiled: CompiledNode;
};

/** 坐标的 Weave 节点 */
export type WeaveCoordinateNode<TUsage> = WeaveNodeBase<IRCoordinate, TUsage> & {
  /** 坐标类别 */
  type: 'coordinate';
  /** Core 定义的完整编译状态，候选计算只读消费旧状态 */
  compiled: CompiledCoordinate;
};

/** 路径的 Weave 节点，路径步骤保留在自身输入中 */
export type WeavePathNode<TUsage> = WeaveNodeBase<IRPathBase, TUsage> & {
  /** 路径类别 */
  type: 'path';
  /** Core 定义的完整编译状态，候选计算只读消费旧状态 */
  compiled: CompiledPath;
};

/** Scope 的 Weave 节点，递归声明只由 children 保存 */
export type WeaveScopeNode<TUsage> = WeaveNodeBase<Omit<IRScope, 'children'>, TUsage> & {
  /** Scope 类别 */
  type: 'scope';
  /** Core 定义的完整编译状态，候选计算只读消费旧状态 */
  compiled: CompiledScope;
  /** 按声明顺序排列的子节点 */
  children: Array<WeaveNode<TUsage>>;
  /** 仅局部命名空间持有，key 为用户 id；普通 Scope 使用所属命名空间 */
  ids?: Map<string, WeaveNode<TUsage>>;
};

/**
 * 展开后的基础元素联合，不包含声明根与 Composite
 * @template TUsage 消费者记录的依赖读取需求
 */
export type WeaveNode<TUsage> =
  | WeaveCoordinateNode<TUsage>
  | WeavePathNode<TUsage>
  | WeaveScopeNode<TUsage>
  | WeaveShapeNode<TUsage>;

/** 声明根容器，不承担 Layout 计算职责 */
export type WeaveRoot<TUsage> = {
  /** 根容器类别 */
  type: 'root';
  /** 根没有父节点 */
  parent: null;
  /** 按声明顺序排列的顶层节点 */
  children: Array<WeaveNode<TUsage>>;
  /** 本版本持有的稳定编译环境 */
  environment: CompileEnvironment;
  /** 根命名空间的用户 id 索引 */
  ids: Map<string, WeaveNode<TUsage>>;
};

/** Weave 编译树的已提交与候选版本入口 */
export type WeaveTree<TUsage> = {
  /** 已提交版本的声明根，候选计算期间保持只读 */
  current: WeaveRoot<TUsage>;
  /** 候选版本的声明根，无候选计算时为 null */
  candidate: WeaveRoot<TUsage> | null;
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
export type WeavePendingInput<TUsage> =
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
      producer: WeaveNode<TUsage>;
      /** 依赖结果变化可能影响的计算范围 */
      changes: ReadonlySet<WeaveChangeKind>;
    };
