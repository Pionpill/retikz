import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';

import type {
  ChildLayoutConstraint,
  CompositeReplay,
  CompositeReplayPlacement,
  ScenePrimitive,
  SceneResource,
  Transform,
} from '../../contract';
import type { IRChild, IRPathBase, IRPosition, JsonValue, ResolvedDropShadow } from '../../schemas';
import type { NamespaceFrameChange, NamespaceStack } from '../namespace';
import type { NodeLayout } from '../node';
import type { StyleFrame } from '../style';
import type { CompileOccurrenceLocator, CompositeCompileArtifact, NodeLayoutCompileArtifact } from '../types';
import type { CompileWarning } from '../warning';
import type { CompileContext } from './context';
import type { InternalScenePrimitive, PathPlaceholder, PrimitiveZIndexTable } from './primitive';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = {
  /** 已合并样式和动画过滤后的 path IR */
  path: IRPathBase;
  /** warning 与诊断使用的 IR locator */
  irPath: string;
  /** path 所在 scope 的累计 transform */
  scopeChain: Array<Transform>;
  /** path 几何完成后写入的当前 frame bbox 贡献 */
  boundsSink: Array<LayoutBoundsContribution>;
  /** path allocation 几何贡献 */
  allocationSink: Array<LayoutBoundsContribution>;
  /** path 在所属 primitive sink 中的原位回填槽 */
  placeholderSlot: { primitiveSink: Array<InternalScenePrimitive>; placeholder: PathPlaceholder };
  /** 编译期排序用 zIndex，不写入 Scene primitive */
  zIndex?: number;
};

/** child 遍历编译后的 primitive 与自动 layout bbox */
export type TraversalResult = {
  /** 已完成排序和占位回填的 Scene primitive */
  primitives: Array<ScenePrimitive>;
  /** 与 primitives 对齐的父层 zIndex，仅供同一次 compile 内 replay 复用 */
  primitiveZIndices: Array<number | undefined>;
  /** 自动 layout 使用的全局 bbox */
  layoutBounds: AxisAlignedBounds | undefined;
  /** 顶层 child 对父 Scope 的 allocation layout 贡献 */
  layouts: Array<NodeLayout>;
  /** 顶层自动 layout 几何贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** 顶层父布局 allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 顶层真实 Node 布局观测 */
  observations: Array<PendingNodeLayoutObservation>;
  /** 本次 traversal 最终逻辑树的 artifacts */
  artifacts: Array<CompositeCompileArtifact | NodeLayoutCompileArtifact>;
};

/** layout-aware child probe 保存的全部可提交贡献 */
export type CompositeReplayTransaction = {
  /** 防止同一个 token 重复 placement */
  used: boolean;
  /** probe 完成的 primitive tree */
  primitives: Array<ScenePrimitive>;
  /** 与 primitives 对齐的父层 zIndex */
  primitiveZIndices: Array<number | undefined>;
  /** probe 的父布局输入 */
  layouts: Array<NodeLayout>;
  /** probe 自动 layout 几何贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** probe allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** probe Node layout 观测 */
  observations: Array<PendingNodeLayoutObservation>;
  /** probe namespace 当前 frame 变更 */
  namespaceChanges: Array<NamespaceFrameChange>;
  /** probe 已解析资源 */
  resources: Array<SceneResource>;
  /** 仅在 replay 时发布的 warning */
  warnings: Array<CompileWarning>;
  /** 仅在 replay 时发布的 artifacts */
  artifacts: Array<CompositeCompileArtifact | NodeLayoutCompileArtifact>;
};

/** 同一次 compile 独占的 replay token 表 */
export type CompositeCompileSession = {
  /** token → 隔离 probe 结果；不跨 compile 共享 */
  replayTransactions: WeakMap<object, CompositeReplayTransaction>;
  /** 当前 compile 接受的 token 所有者标识 */
  owner: object;
};

/** 单次 traversal 的可选隔离输入 */
export type TraversalCompileOptions = {
  /** probe 继承的 namespace snapshot */
  namespaceStack?: NamespaceStack;
  /** probe 继承的当前 scope chain */
  scopeChain?: ReadonlyArray<Transform>;
  /** probe 继承的样式栈 */
  styleStack?: ReadonlyArray<StyleFrame>;
  /** 当前 child 根 occurrence；省略时按 canonical IR path 分配 */
  occurrence?: CompileOccurrenceLocator;
  /** 当前 traversal 的 composite 深度 */
  compositeDepth?: number;
  /** root child 是否来自 provider 输入 / 输出 */
  generated?: boolean;
  /** 当前父约束 */
  constraint?: ChildLayoutConstraint;
  /** 根 compile 共享 session */
  session?: CompositeCompileSession;
};

/** 整棵 child 树遍历期间共享的可变状态 */
export type TraversalState = {
  /** 顶层 primitive 输出容器，path 占位会在返回前回填 */
  primitives: Array<InternalScenePrimitive>;
  /** 自动 layout 使用的全局 bbox */
  layoutBounds: AxisAlignedBounds | undefined;
  /** id 注册与查找栈 */
  namespaceStack: NamespaceStack;
  /** primitive 的编译期 zIndex 旁路表 */
  zIndexOf: PrimitiveZIndexTable;
  /** 尚未回填的 path 占位数量 */
  placeholderBalance: number;
};

/** child 遍历期间使用的 compile 依赖 */
export type TraversalContext = Pick<
  CompileContext,
  | 'measureText'
  | 'lowerTex'
  | 'onWarn'
  | 'round'
  | 'nodeDistance'
  | 'labelDistance'
  | 'rootFontSize'
  | 'shapes'
  | 'boundaries'
  | 'arrows'
  | 'pathGenerators'
  | 'pathKinds'
  | 'ribbonWidthProfiles'
  | 'paint'
  | 'clip'
  | 'composites'
  | 'maxCompositeDepth'
  | 'artifacts'
> & {
  /** 当前 traversal 接收到的父约束 */
  constraint: ChildLayoutConstraint;
  /** 同次 compile 的 replay token 表 */
  session: CompositeCompileSession;
};

/** child 遍历期间共享的运行时对象 */
export type TraversalRuntime = {
  /** 遍历可变状态 */
  state: TraversalState;
  /** compile 只读依赖 */
  context: TraversalContext;
};

/** 递归处理一层 child 时的上下文 */
export type TraversalFrame = {
  /** 只供当前直接 child 消费的父约束；递归 Scope 不向普通后代广播 */
  childConstraint?: ChildLayoutConstraint;
  /** 当前 scope 累计 transform */
  scopeChain: ReadonlyArray<Transform>;
  /** 当前层 primitive 输出容器 */
  primitiveSink: Array<InternalScenePrimitive>;
  /** 当前层 IR locator 前缀 */
  locatorPrefix: string;
  /** 向父 scope 汇报 bbox 输入 layout */
  layoutSink: Array<NodeLayout>;
  /** 当前层延迟 emit 的 path 任务 */
  pathSink: Array<PendingPathEmission>;
  /** 当前层样式继承栈 */
  styleStack: ReadonlyArray<StyleFrame>;
  /** 当前层及后代注册的全局 layout 对象，供 Scope 收尾时原位升级到最终几何 */
  publicationSink: Array<NodeLayout>;
  /** 当前层自动 viewBox 几何贡献；Scope 收尾后再投到父 frame */
  boundsSink: Array<LayoutBoundsContribution>;
  /** 当前层父布局 allocation 几何贡献 */
  allocationSink: Array<LayoutBoundsContribution>;
  /** 延迟到完整 Scope chain 冻结后发布的 Node layout observer 记录 */
  observationSink: Array<PendingNodeLayoutObservation>;
  /** 最终逻辑树 artifact 输出容器 */
  artifactSink: Array<CompositeCompileArtifact | NodeLayoutCompileArtifact>;
};

export type NodeChild = Extract<IRChild, { type: 'node' }>;
export type CoordinateChild = Extract<IRChild, { type: 'coordinate' }>;
export type ScopeChild = Extract<IRChild, { type: 'scope' }>;
export type PathChild = Extract<IRChild, { type: 'path' | 'ribbon' }>;

/** scope.id layout 占位注册结果 */
export type ScopeLayoutPlaceholder = {
  /** scope.id 所在父 namespace frame 深度 */
  parentFrameDepth: number;
  /** scope.id 初始占位 layout；无 id 时不存在 */
  placeholderLayout?: NodeLayout;
};

export type ScopeLayoutPlaceholderContext = {
  index: number;
  frame: TraversalFrame;
};

export type EmitScopeGroupContext = {
  index: number;
  scopeTransforms: ReadonlyArray<Transform>;
  scopePrimitiveSink: Array<InternalScenePrimitive>;
  frame: TraversalFrame;
};

/** 自动 viewBox 的当前 frame 几何贡献 */
export type LayoutBoundsContribution = {
  /** 当前 frame 中的几何点 */
  points: Array<IRPosition>;
  /** 与该点集关联的阴影外溢 */
  shadow?: ResolvedDropShadow;
};

/** 等完整 Scope chain 冻结后再发送的节点布局观测记录 */
export type PendingNodeLayoutObservation = {
  /** 节点自身局部 layout */
  layout: NodeLayout;
  /** 从节点所在 frame 到 world 的最终 chain；Scope 收尾期间原位插入 own transforms */
  scopeChain: Array<Transform>;
  /** Node occurrence locator */
  occurrence: CompileOccurrenceLocator;
};

/** 紧邻 schema parse 后可调用的 layout-aware composite 形态 */
export type CallableLayoutCompositeDefinition = {
  namespace: string;
  type: string;
  artifactSchema?: { parse: (value: unknown) => JsonValue };
  compile: (
    node: unknown,
    context: {
      constraint: ChildLayoutConstraint;
      layoutChild: (
        child: IRChild,
        constraint: ChildLayoutConstraint,
      ) => {
        allocationBounds: Readonly<BoundsRect>;
        visualBounds: Readonly<BoundsRect>;
        replay: CompositeReplay;
      };
    },
  ) => {
    children: ReadonlyArray<IRChild | CompositeReplayPlacement>;
    artifact?: JsonValue;
  };
};
