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
  SceneResources,
  prepareScopePlacement,
} from '@retikz/core';

import type { SharedCompileContext } from '../../compile';
import type { WeaveChangeKind, WeaveChangeSource, WeaveOperationKind } from './constants';
import type { WeaveContribution } from './contribution';
import type { WeaveCompileRead } from './read';
import type { WeaveReferenceRead } from './reference';

/** 名称读取与父包络聚合实际依赖的最终结果粒度 */
export type WeaveDependencyKind = ReferenceReadKind | 'layout';

/** 节点自身输入与有效继承上下文，不重复保存合并后的输入 */
type InputWeave<TInput> = {
  /** Core 定义的自身输入 */
  own: TInput;
  /** Core 负责解析的有效继承上下文 */
  context: CanonicalScopeInheritance;
};

/** Weave 独有的跨批有效性依据，不包装或重复保存 Core 产物 */
export type WeaveCacheMetadata = Readonly<{
  /** 确定化依赖的输入与环境 */
  resolveInputs: unknown;
  /** 计算所需的额外上下文 */
  compileInputs: unknown;
  /** 实际读取事实 */
  reads: ReadonlyArray<WeaveReferenceRead>;
  /** 配套资源 */
  resources: SceneResources;
  /** 有诊断时重新计算并派发 */
  diagnostics: ReadonlyArray<CompileWarning>;
  /** Scope 在后代计算前产出的放置准备 */
  scopePreparation?: ReturnType<typeof prepareScopePlacement>;
  /** Scope 最终可见输出的诊断 */
  outputDiagnostics?: ReadonlyArray<CompileWarning>;
}>;

/** 节点的可替换逻辑状态，集合写入由候选工作区隔离 */
type WeaveNodeStateBase<TInput> = {
  /** 阶段复用依据与资源诊断；实际产物分别保存在 canon / compiled */
  cache?: WeaveCacheMetadata;
  /** 作者元素的局部输出；Scope 不保存后代的完整输出 */
  contribution?: WeaveContribution;
  /** 所属声明容器，引用稳定对象 */
  parent: WeaveRoot | WeaveScopeNode;
  /** 自身输入与有效上下文，替换对象而非修改共享内容 */
  input: Readonly<InputWeave<TInput>>;
  /** 本批待处理变化 */
  pendingInputs: ReadonlyArray<Readonly<InputWeavePending>>;
  /** 依赖与读取粒度，值也保持只读 */
  dependencies: ReadonlyMap<WeaveNode, ReadonlyArray<WeaveDependencyKind>>;
  /** 反向消费者 */
  consumers: ReadonlySet<WeaveNode>;
};

/** 普通图元状态 */
type WeaveShapeState = WeaveNodeStateBase<IRNode> & {
  /** Core 已补全的配置与能力绑定 */
  canon: CanonicalNode | null;
  /** Core 完整编译产物，只读复用 */
  compiled: CompiledNode | null;
};

/** 坐标状态 */
type WeaveCoordinateState = WeaveNodeStateBase<IRCoordinate> & {
  /** Core 已补全的位置表达式 */
  canon: CanonicalCoordinate | null;
  /** Core 最终位置，只读复用 */
  compiled: CompiledCoordinate | null;
};

/** 路径状态 */
type WeavePathState = WeaveNodeStateBase<IRPathBase> & {
  /** Core 已补全的路径配置与能力绑定 */
  canon: PathResolution | null;
  /** Core 完整编译产物，只读复用 */
  compiled: CompiledPath | null;
};

/** Scope 状态，自身输入不重复保存 children */
type WeaveScopeState = WeaveNodeStateBase<Omit<IRScope, 'children'>> & {
  /** Scope 输出由子贡献组装，不跨批重复缓存完整子树 */
  contribution?: never;
  /** Core 已补全的自身配置及后代继承覆盖 */
  canon: CanonicalScope | null;
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
type WeaveShapeNode = WeaveNodeVersions<WeaveShapeState> & {
  /** 不随状态变化的类别 */
  readonly type: 'node';
};

/** 稳定坐标引用 */
type WeaveCoordinateNode = WeaveNodeVersions<WeaveCoordinateState> & {
  /** 不随状态变化的类别 */
  readonly type: 'coordinate';
};

/** 稳定路径引用 */
type WeavePathNode = WeaveNodeVersions<WeavePathState> & {
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

/** 作者 Composite 的不透明更新边界，不公开生成节点 */
type WeaveCompositeNode = WeaveNodeVersions<
  WeaveNodeStateBase<IRComposite> & {
    /** Composite 以输出贡献作为实例边界，不伪造基础元素阶段产物 */
    compiled?: never;
  }
> & {
  /** 稳定的作者声明类别 */
  readonly type: 'composite';
};

/** 作者元素联合，不包含生成节点或声明根 */
export type WeaveNode = WeaveCompositeNode | WeaveCoordinateNode | WeavePathNode | WeaveScopeNode | WeaveShapeNode;

/** 根状态，集合、记录与输入随候选隔离 */
type WeaveRootState = {
  /** 根没有父节点 */
  parent: null;
  /** Scene 自身输入 */
  input: Omit<IRScene, 'children'>;
  /** 有序顶层节点 */
  children: ReadonlyArray<WeaveNode>;
  /** Core 只读环境 */
  shared: SharedCompileContext;
  /** 用户 id 索引 */
  ids: ReadonlyMap<string, WeaveNode>;
  /** 根自身及所有 Scope 的定位索引 */
  scopeIds: ReadonlyMap<string, WeaveRoot | WeaveScopeNode>;
  /** 包含缺失读取的名称订阅，与候选节点同批隔离 */
  readers: ReadonlyMap<string, ReadonlySet<WeaveNode>>;
  /** 元素读取事实及诊断，替换记录而非修改共享值 */
  records: ReadonlyMap<
    WeaveNode,
    Readonly<{
      reads: ReadonlyArray<WeaveCompileRead>;
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
      producer: WeaveNode;
      /** 依赖结果变化可能影响的计算范围 */
      changes: ReadonlySet<WeaveChangeKind>;
    };
