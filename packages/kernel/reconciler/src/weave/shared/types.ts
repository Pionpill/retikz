import type {
  CompileWarning,
  ReferenceReadKind,
  CompiledNode,
  CompiledCoordinate,
  CanonicalCoordinate,
  CanonicalNode,
  PathResolution,
  CompiledPath,
  CompiledScope,
  CanonicalScope,
  CanonicalScopeInheritance,
  IRComposite,
  IRCoordinate,
  IRNode,
  IRPathBase,
  IRScope,
  IRScene,
  ScenePrimitive,
  SceneResources,
  Transform,
  LayoutProposal,
  MergedScopeDefaults,
  ThemeMode,
  ScopePlacementPreparation,
  CompiledReferenceGeometry,
  SceneClipPath,
} from '@retikz/core';
import type { AxisAlignedBounds } from '@retikz/math';

import type { SharedCompileContext } from '../../compile';
import type { WeaveChangeKind, WeaveChangeSource, WeaveOperationKind } from './constants';
import type { WeaveContribution } from './contribution';
import type { WeaveReferenceRead } from './reference';

/** 名称读取与父包络聚合实际依赖的最终结果粒度 */
export type WeaveDependencyKind = ReferenceReadKind | 'layout';

/** 当前阶段的名称读取与作者节点依赖 */
export type WeaveCompileRead = Readonly<{
  /** 查询名称 */
  name: string;
  /** 消费者实际读取的结果粒度 */
  kind: ReferenceReadKind;
  /** 查询结果 */
  state: 'missing' | 'pending' | 'ready';
  /** 命中声明对应的稳定作者节点 */
  binding?: WeaveEntry;
}>;

/** 节点自身输入与有效继承上下文，不重复保存合并后的输入 */
type InputWeave<TInput> = {
  /** Core 定义的自身输入 */
  own: TInput;
  /** Core 负责解析的有效继承上下文 */
  context: CanonicalScopeInheritance;
};

/** 节点待处理变化，影响范围去重不代表依赖已就绪 */
type InputWeavePending =
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
      producer: WeaveEntry;
      /** 依赖结果变化可能影响的计算范围 */
      changes: ReadonlySet<WeaveChangeKind>;
    };

/** 确定化阶段实际消费的输入、上下文与 Core 产物 */
type WeaveResolve<TInput, TContext, TValue> = Readonly<{
  /** 阶段实际消费的输入 */
  input: TInput;
  /** 影响确定化结果的上下文 */
  context: TContext;
  /** Core 确定化结果 */
  value: TValue;
}>;

/** 编译阶段的复用上下文、Core 产物与回放事实 */
type WeaveCompile<TContext, TValue> = Readonly<{
  /** 影响编译结果的上下文 */
  context: TContext;
  /** 本次计算使用的资源 */
  resources: SceneResources;
  /** 本次计算需要回放的诊断 */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** Core 编译结果 */
  value: TValue;
}>;

/** 作者元素的可替换逻辑状态，集合写入由候选工作区隔离 */
type WeaveElementStateBase = {
  /** 所属声明容器，引用稳定对象 */
  parent: WeaveRoot | WeaveScopeEntry;
  /** 本批待处理变化 */
  pendingInputs: ReadonlyArray<Readonly<InputWeavePending>>;
  /** 名称查询、旧绑定与几何快照，按准备和输出阶段验证，随候选状态隔离 */
  referenceReads: ReadonlyArray<WeaveReferenceRead>;
  /** 依赖与读取粒度，值也保持只读 */
  dependencies: ReadonlyMap<WeaveEntry, ReadonlyArray<WeaveDependencyKind>>;
  /** 反向消费者 */
  consumers: ReadonlySet<WeaveEntry>;
};

/** Node 元素状态 */
export type WeaveNodeState = WeaveElementStateBase & {
  /** 当前作者声明与有效继承上下文 */
  origin: Readonly<InputWeave<IRNode>>;
  /** 最近一次确定化记录 */
  resolve?: WeaveResolve<
    IRNode,
    {
      /** 确定化时实际继承的 Node 默认值 */
      nodeDefaults: MergedScopeDefaults['node'];
      /** 确定化时使用的主题模式 */
      mode: ThemeMode;
    },
    CanonicalNode
  >;
  /** 最近一次编译记录 */
  compile?: WeaveCompile<
    {
      /** 编译使用的祖先变换链 */
      scopeChain: ReadonlyArray<Transform>;
      /** 当前布局提案，缺失时按独立节点编译 */
      proposal: LayoutProposal | undefined;
    },
    CompiledNode
  >;
  /** 作者元素的局部输出 */
  contribution?: WeaveContribution;
};

/** 坐标状态 */
export type WeaveCoordinateState = WeaveElementStateBase & {
  /** 当前作者声明与有效继承上下文 */
  origin: Readonly<InputWeave<IRCoordinate>>;
  /** 最近一次确定化记录 */
  resolve?: WeaveResolve<
    IRCoordinate,
    {
      /** 确定化使用的节点间距 */
      nodeDistance: number;
    },
    CanonicalCoordinate
  >;
  /** 最近一次编译记录 */
  compile?: WeaveCompile<
    {
      /** 编译使用的祖先变换链 */
      scopeChain: ReadonlyArray<Transform>;
    },
    CompiledCoordinate
  >;
  /** 作者元素的局部输出 */
  contribution?: WeaveContribution;
};

/** 路径状态 */
export type WeavePathState = WeaveElementStateBase & {
  /** 当前作者声明与有效继承上下文 */
  origin: Readonly<InputWeave<IRPathBase>>;
  /** 最近一次确定化记录 */
  resolve?: WeaveResolve<
    IRPathBase,
    {
      /** 确定化时实际继承的 Path 默认值 */
      pathDefaults: MergedScopeDefaults['path'];
      /** 确定化时使用的主题模式 */
      mode: ThemeMode;
    },
    PathResolution
  >;
  /** 最近一次编译记录 */
  compile?: WeaveCompile<
    {
      /** 编译使用的祖先变换链 */
      scopeChain: ReadonlyArray<Transform>;
    },
    CompiledPath
  >;
  /** 作者元素的局部输出 */
  contribution?: WeaveContribution;
};

/** Scope 状态，自身声明不重复保存 children */
export type WeaveScopeState = WeaveElementStateBase & {
  /** 当前作者声明与有效继承上下文 */
  origin: Readonly<InputWeave<Omit<IRScope, 'children'>>>;
  /** 最近一次确定化记录 */
  resolve?: WeaveResolve<
    Omit<IRScope, 'children'>,
    {
      /** 确定化时实际继承的 Scope 样式 */
      inheritedStyle: CanonicalScopeInheritance;
    },
    CanonicalScope
  >;
  /** 最近一次编译记录；准备和输出事实只属于 Scope */
  compile?: WeaveCompile<
    {
      /** 后代计算前的放置准备 */
      preparation: ScopePlacementPreparation;
      /** 子布局构成的包络输入 */
      layouts: Array<CompiledReferenceGeometry>;
      /** 编译使用的祖先变换链 */
      scopeChain: ReadonlyArray<Transform>;
      /** 参与输出绑定的直接子图元数量 */
      childCount: number;
      /** 已在当前名称环境解析的裁剪路径 */
      preResolvedClipPath: SceneClipPath | undefined;
    },
    CompiledScope
  > &
    Readonly<{
      /** 矩形包络的原始极值，仅供后续几何变化判断，随编译事务替换 */
      envelopeBounds?: Readonly<AxisAlignedBounds>;
      /** 最终输出绑定后的诊断，与编译阶段诊断分开回放 */
      outputDiagnostics?: ReadonlyArray<CompileWarning>;
    }>;
  /** 有序子节点 */
  children: ReadonlyArray<WeaveEntry>;
  /** 仅局部命名空间持有的用户 id 索引 */
  ids?: ReadonlyMap<string, WeaveEntry>;
};

/** 稳定 Node 元素引用 */
type WeaveNodeEntry = {
  /** 不随状态变化的类别 */
  readonly type: 'node';
  /** 已提交状态，首次提交前为 null */
  current: WeaveNodeState | null;
  /** 候选状态，无候选时为 null */
  pending: WeaveNodeState | null;
};

/** 稳定坐标引用 */
type WeaveCoordinateEntry = {
  /** 不随状态变化的类别 */
  readonly type: 'coordinate';
  /** 已提交状态，首次提交前为 null */
  current: WeaveCoordinateState | null;
  /** 候选状态，无候选时为 null */
  pending: WeaveCoordinateState | null;
};

/** 稳定路径引用 */
type WeavePathEntry = {
  /** 不随状态变化的类别 */
  readonly type: 'path';
  /** 已提交状态，首次提交前为 null */
  current: WeavePathState | null;
  /** 候选状态，无候选时为 null */
  pending: WeavePathState | null;
};

/** 稳定 Scope 引用 */
export type WeaveScopeEntry = {
  /** 不随状态变化的类别 */
  readonly type: 'scope';
  /** 树内唯一且在容器生命周期内稳定的定位地址 */
  readonly scopeId: string;
  /** 已提交状态，首次提交前为 null */
  current: WeaveScopeState | null;
  /** 候选状态，无候选时为 null */
  pending: WeaveScopeState | null;
};

/** Composite 只保存声明与贡献，不伪造基础元素的确定化或编译产物 */
type WeaveCompositeState = WeaveElementStateBase & {
  /** 自身输入与有效上下文 */
  origin: Readonly<InputWeave<IRComposite>>;
  /** 作者 Composite 的完整实例输出 */
  contribution?: WeaveContribution;
};

/** 作者 Composite 的不透明更新边界，不公开生成节点 */
type WeaveCompositeEntry = {
  /** 稳定的作者声明类别 */
  readonly type: 'composite';
  /** 已提交状态，首次提交前为 null */
  current: WeaveCompositeState | null;
  /** 候选状态，无候选时为 null */
  pending: WeaveCompositeState | null;
};

/** 作者元素联合，不包含生成节点或声明根 */
export type WeaveEntry = WeaveCompositeEntry | WeaveCoordinateEntry | WeavePathEntry | WeaveScopeEntry | WeaveNodeEntry;

/** 根状态，集合、记录与输入随候选隔离 */
type WeaveRootState = {
  /** 已检查的声明树是否无重名；随根事务一起提交或恢复 */
  uniqueDeclarations?: boolean;
  /** 无重放副作用的顶层输出分块，内部缓存不暴露给快照消费者 */
  outputBlocks?: ReadonlyArray<Readonly<{ primitives: Array<ScenePrimitive>; bounds?: AxisAlignedBounds }> | undefined>;
  /** 根没有父节点 */
  parent: null;
  /** Scene 自身输入 */
  origin: Omit<IRScene, 'children'>;
  /** 有序顶层节点 */
  children: ReadonlyArray<WeaveEntry>;
  /** Core 只读环境 */
  shared: SharedCompileContext;
  /** 用户 id 索引 */
  ids: ReadonlyMap<string, WeaveEntry>;
  /** 根自身及所有 Scope 的定位索引 */
  scopeIds: ReadonlyMap<string, WeaveRoot | WeaveScopeEntry>;
  /** 包含缺失读取的名称订阅，与候选节点同批隔离 */
  readers: ReadonlyMap<string, ReadonlySet<WeaveEntry>>;
  /** 元素读取事实及诊断，替换记录而非修改共享值 */
  records: ReadonlyMap<
    WeaveEntry,
    Readonly<{
      reads: ReadonlyArray<WeaveCompileRead>;
      diagnostics: ReadonlyArray<CompileWarning>;
    }>
  >;
};

/** 稳定声明根，不承担 Layout 计算 */
export type WeaveRoot = {
  /** 根类别 */
  readonly type: 'root';
  /** 根定位地址 */
  readonly scopeId: string;
  /** 已提交状态，首次提交前为 null */
  current: WeaveRootState | null;
  /** 候选状态，无候选时为 null */
  pending: WeaveRootState | null;
};

/** 基础元素的完整自身输入，Scope 不包含声明子树 */
export type InputWeaveOwn = IRNode | IRCoordinate | IRPathBase | Omit<IRScope, 'children'>;

/** 可插入的基础元素声明，递归子树不包含 Composite */
export type InputWeaveElement =
  | IRNode
  | IRCoordinate
  | IRPathBase
  | (Omit<IRScope, 'children'> & {
      /** 按声明顺序排列的基础元素 */
      children: Array<InputWeaveElement>;
    });

/** 通过树内唯一 id 定位 Scope 自身 */
type WeaveScopeTarget = {
  /** Scope 自身定位 */
  kind: 'scope';
  /** Scope 定位 id */
  scopeId: string;
};

/** 在指定容器的命名空间上下文中查找用户 id */
type WeaveIdTarget = {
  /** 用户 id 定位 */
  kind: 'id';
  /** Scope 或 root 的容器定位 id */
  scopeId: string;
  /** 用户绘图 id */
  id: string;
};

/** 按容器直接 children 中的位置定位 */
type WeaveChildTarget = {
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
type WeaveInsertOperation = {
  /** 插入操作 */
  kind: typeof WeaveOperationKind.Insert;
  /** Scope 或 root 的容器定位 id */
  parentId: string;
  /** 插入前的位置，等于 children 长度时追加 */
  index: number;
  /** 按顺序插入的完整声明，空数组不产生修改 */
  elements: Array<InputWeaveElement>;
};

/** 完整替换已有元素自身输入，不改变类别或 Scope children */
type WeaveUpdateOperation = {
  /** 修改操作 */
  kind: typeof WeaveOperationKind.Update;
  /** 已有元素的地址 */
  target: WeaveTarget;
  /** 类别必须与目标一致，省略旧覆盖字段表示移除覆盖 */
  input: InputWeaveOwn;
};

/** 删除元素；Scope 连同其声明子树删除 */
type WeaveRemoveOperation = {
  /** 删除操作 */
  kind: typeof WeaveOperationKind.Remove;
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
