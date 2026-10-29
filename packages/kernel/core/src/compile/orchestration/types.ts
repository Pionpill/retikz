import type { PropertyPath } from '@retikz/foundation';
import type { AxisAlignedBounds } from '@retikz/math';

import type {
  CompileOccurrenceLocator,
  CompositeBoundChild,
  CompositeCompileChild,
  CompositeCompileScopeProps,
  CompositeReplay,
  CompositeReplayWrapper,
  LayoutAlignmentGuide,
  LayoutContribution,
  LayoutMeasurementAxis,
  LayoutProposal,
  SceneClipPath,
  ScenePrimitive,
  SceneResource,
  Transform,
} from '../../contract';
import type { CompositeInputScope } from '../../contract/composite';
import type { MergedScopeDefaults } from '../../resolve';
import type { CanonicalDropShadow, IRChild, IRPathBase, IRPosition } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { WorkspaceCompileContext, SharedCompileContext } from '../context';
import type { NamespaceFrameChange, NamespaceStack } from '../namespace';
import type { CompiledNodeLayout } from '../node';
import type { LayoutProbeFailureEntry } from '../probe-failure';
import type { CompileOwnerKey, CompileProvenanceTracker } from '../provenance';
import type { CompositeArtifact } from '../types';
import type { InputCompileWarning } from '../warning';
import type { InternalScenePrimitive, PathPlaceholder, PrimitiveZIndexTable } from './primitive';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = {
  /** path Source IR，样式与动态 target 解析延迟到 resolving phase */
  path: IRPathBase;
  /** warning 与诊断使用的 IR locator */
  irPath: PropertyPath;
  /** path 所在 scope 的累计 transform */
  scopeChain: ReadonlyArray<Transform>;
  /** path 几何完成后写入的当前 frame bbox 贡献 */
  boundsSink: Array<LayoutBoundsContribution>;
  /** path allocation 几何贡献 */
  allocationSink: Array<LayoutBoundsContribution>;
  /** path 位于该显式 composite allocation boundary 内 */
  allocationBoundary?: object;
  /** path 在所属 primitive sink 中的原位回填槽 */
  placeholderSlot: {
    /** 持有占位项、等待原位回填的图元数组 */
    primitiveSink: Array<InternalScenePrimitive>;
    /** 需要被最终路径图元替换的对象引用 */
    placeholder: PathPlaceholder;
  };
  /** path 的完整 canonical occurrence */
  occurrence: CompileOccurrenceLocator;
  /** Path occurrence 捕获的有效 Theme */
  theme: CanonicalTheme;
  /** Path occurrence 捕获的有效默认配置 */
  scopeDefaults: MergedScopeDefaults;
  /** 产生 path primitive 的语义 owner */
  semanticOwner?: CompileOwnerKey;
  /** 编译期排序用 zIndex，不写入 Scene primitive */
  zIndex?: number;
};

/** child 遍历编译后的 primitive 与自动 layout bbox */
export type TraversalResult = {
  /** 根组件按需产生的 allocation 贡献 */
  contribution?: LayoutContribution;
  /** 已完成排序和占位回填的 Scene primitive */
  primitives: Array<ScenePrimitive>;
  /** 与 primitives 对齐的父层 zIndex，仅供同一次 compile 内 replay 复用 */
  primitiveZIndices: Array<number | undefined>;
  /** 自动 layout 使用的全局 bbox */
  layoutBounds: AxisAlignedBounds | undefined;
  /** 顶层 child 对父 Scope 的 allocation layout 贡献 */
  layouts: Array<CompiledNodeLayout>;
  /** 顶层自动 layout 几何贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** 顶层父布局 allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 本次 traversal 最终逻辑树的 artifacts */
  artifacts: Array<CompositeArtifact>;
  /** 顶层 child 向父布局暴露的无歧义 alignment guides */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
};

/** layout-aware child probe 保存的全部可提交贡献 */
export type CompositeReplayMaterializeContext = Readonly<{
  /** replay child 在最终 authored Scope 中继承的有效默认配置 */
  scopeDefaults: MergedScopeDefaults;
  /** replay child 在最终 authored Scope 中继承的 Theme */
  theme: CanonicalTheme;
  /** replay child 所处 Scope 的 preliminary transform chain */
  scopeChain: ReadonlyArray<Transform>;
}>;

/** 保存布局探测的完整副作用快照，使成功结果可在最终位置仅重放一次 */
export type CompositeReplayTransaction = {
  /** 创建 transaction 的 layout-aware composite callback owner */
  owner: CompositeCompileOwner;
  /** probe 根 occurrence，用于 replay 时保留 probe 内部路径后缀 */
  originOccurrence: CompileOccurrenceLocator;
  /** 防止同一个 token 重复 placement */
  used: boolean;
  /** probe 完成的 primitive tree */
  primitives: Array<ScenePrimitive>;
  /** 与 primitives 对齐的父层 zIndex */
  primitiveZIndices: Array<number | undefined>;
  /** probe 的父布局输入 */
  layouts: Array<CompiledNodeLayout>;
  /** probe 自动 layout 几何贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** probe allocation 几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** probe namespace 当前 frame 变更 */
  namespaceChanges: Array<NamespaceFrameChange>;
  /** 与 namespaceChanges 对齐的最终注册 occurrence */
  namespaceChangeOccurrences: Array<CompileOccurrenceLocator>;
  /** probe root namespace frame 内全部 Kernel identity registrations */
  topologyIdentityIds: Array<string>;
  /** probe 中由 fork baseline collision 产生的 duplicate warning */
  namespaceBaselineWarnings: Array<{
    /** 与探测起始命名空间发生冲突的标识 */
    id: string;
    /** 重放时需要重新判断是否发布的重名诊断 */
    warning: InputCompileWarning;
  }>;
  /** probe 已解析资源 */
  resources: Array<SceneResource>;
  /** 仅在 replay 时发布的 warning */
  warnings: Array<InputCompileWarning>;
  /** 仅在 replay 时发布的 artifacts */
  artifacts: Array<CompositeArtifact>;
  /** probe 时的有效样式语义指纹，用于判断 replay 是否需要在新 Scope 中重新物化 */
  styleFingerprint: string;
  /** probe 时的有效 Theme 语义指纹，用于判断 replay 是否需要在新 Scope 中重新物化 */
  themeFingerprint: string;
  /** replay transaction 是否已经在当前 Scope preliminary chain 中完成 layout publication 投影 */
  scopeChainApplied?: boolean;
  /** 在 authored Scope 样式 / Theme 改变时重新走 Core probe channel 的内部物化器 */
  materialize?: (context: CompositeReplayMaterializeContext) => CompositeReplayTransaction;
};

/** runtime output tree 中的递归节点 */
export type CompositeRuntimeOutputChild =
  | Readonly<{
      /** 区分绑定输入的子项、布局重放与作用域输出 */
      kind: 'bound';
      /** 绑定局部运行时输入的子项 IR */
      child: IRChild;
      /** 仅交给绑定子项消费的运行时输入 */
      runtimeInputs: CompositeInputScope;
    }>
  | Readonly<{
      /** 区分绑定输入的子项、布局重放与作用域输出 */
      kind: 'replay';
      /** 同次编译中布局探测结果的重放凭证 */
      replay: CompositeReplay;
      /** 应用于重放结果的外层变换或包装 */
      wrapper?: CompositeReplayWrapper;
    }>
  | Readonly<{
      /** 区分绑定输入的子项、布局重放与作用域输出 */
      kind: 'scope';
      /** 生成作用域的继承、变换与布局属性 */
      props: CompositeCompileScopeProps;
      /** 按输出顺序排列的作用域子项 */
      children: ReadonlyArray<IRChild | CompositeCompileChild | CompositeBoundChild>;
    }>;

/** 单个 layout-aware composite callback 的 runtime owner */
export type CompositeCompileOwner = Readonly<{
  /** 错误消息使用的 composite key 与 occurrence */
  label: string;
}>;

/** opaque output handle 对应的 callback-local runtime entry */
type CompositeRuntimeOutputEntry = Readonly<{
  /** 创建该输出句柄的复合组件回调身份 */
  owner: CompositeCompileOwner;
  /** 句柄对应的实际输出子树 */
  child: CompositeRuntimeOutputChild;
}> & {
  /** 输出句柄是否已经被消费，防止重复放置 */
  used: boolean;
};

/** layoutChild 返回对象对应的 callback-local replay identity */
type CompositeLayoutResultEntry = Readonly<{
  /** 创建布局结果的复合组件回调身份 */
  owner: CompositeCompileOwner;
  /** 与该布局结果绑定的重放凭证 */
  replay: CompositeReplay;
}>;

/** 同一次 compile 独占的 replay 与 runtime output handle 表 */
export type CompositeCompileSession = {
  /** 有界的编译内成功贡献缓存 */
  measurements: Map<string, LayoutContribution>;
  /** 对象依赖的编译内身份 */
  measurementIdentities: WeakMap<object, number>;
  /** 不可 JSON 编码的原始运行时输入也按值身份区分 */
  measurementPrimitiveIdentities: Map<unknown, number>;
  /** 下一个局部身份序号 */
  nextMeasurementIdentity: number;
  /** token → 隔离 probe 结果；不跨 compile 共享 */
  replayTransactions: WeakMap<object, CompositeReplayTransaction>;
  /** LayoutChildResult identity → replay token；拒绝复制或伪造 result */
  layoutResults: WeakMap<object, CompositeLayoutResultEntry>;
  /** opaque handle → runtime output 节点；不跨 compile 共享 */
  outputChildren: WeakMap<object, CompositeRuntimeOutputEntry>;
  /** 以不透明布局失败标识索引当前回调或编译内的失败元数据 */
  failures: WeakMap<object, LayoutProbeFailureEntry>;
};

/** 单次 traversal 的可选隔离输入 */
export type TraversalCompileOptions = {
  /** 仅作用于本次 traversal 根组件的需求 */
  measurementAxis?: LayoutMeasurementAxis;
  /** 查询 probe 在 Scope 出栈前读取最终引用环境，不向公共 context 暴露可变状态 */
  captureScopeTargets?: (child: ScopeChild, namespace: NamespaceStack, chain: ReadonlyArray<Transform>) => void;
  /** probe 或显式绑定子项的局部运行时输入 */
  runtimeInputs?: CompositeInputScope;
  /** 当前 traversal 是否为 layoutChild 隔离 probe */
  probe?: boolean;
  /** probe 继承的 namespace snapshot */
  namespaceStack?: NamespaceStack;
  /** probe 继承的当前 scope chain */
  scopeChain?: ReadonlyArray<Transform>;
  /** probe 继承的有效默认配置 */
  scopeDefaults?: MergedScopeDefaults;
  /** 隔离 traversal 继承的完整 Theme */
  theme?: CanonicalTheme;
  /** 当前 child 根 occurrence；省略时按 canonical IR path 分配 */
  occurrence?: CompileOccurrenceLocator;
  /** 当前 traversal 的 composite 深度 */
  compositeDepth?: number;
  /** root child 是否来自 provider 输入 / 输出 */
  generated?: boolean;
  /** 当前 root child 收到的完整双轴 proposal */
  proposal?: LayoutProposal;
  /** 根 compile 共享 session */
  session?: CompositeCompileSession;
  /** 按需收集同次编译来源 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 隔离 traversal 继承的 semantic owner */
  semanticOwner?: CompileOwnerKey;
  /** 向隔离 namespace callback 暴露当前 warning occurrence */
  observeWarningOccurrence?: (occurrence: CompileOccurrenceLocator | undefined) => void;
};

/** 整棵 child 树遍历期间共享的可变状态 */
type TraversalState = {
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
  /** 可选编译来源收集器 */
  provenanceTracker?: CompileProvenanceTracker;
};

/** child 遍历期间使用的 compile 依赖 */
type TraversalContext = {
  /** 跨次共享的编译能力 */
  shared: SharedCompileContext;
  /** 当前遍历使用的计算工作区 */
  workspace: WorkspaceCompileContext;
  /** 当前 traversal 接收到的完整双轴 proposal */
  proposal: LayoutProposal;
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
  /** 当前 Source 容器的局部实例输入，生成普通 child 不继承 */
  runtimeInputs?: CompositeInputScope;
  /** 只供当前直接 child 消费的父 proposal；递归 Scope 不向普通后代广播 */
  childProposal?: LayoutProposal;
  /** 当前 scope 累计 transform */
  scopeChain: ReadonlyArray<Transform>;
  /** 当前层 primitive 输出容器 */
  primitiveSink: Array<InternalScenePrimitive>;
  /** 当前层 IR locator 前缀 */
  locatorPrefix: PropertyPath;
  /** 向父 scope 汇报 bbox 输入 layout */
  layoutSink: Array<CompiledNodeLayout>;
  /** 当前层延迟 emit 的 path 任务 */
  pathSink: Array<PendingPathEmission>;
  /** 当前层共享的有效默认配置 */
  scopeDefaults: MergedScopeDefaults;
  /** 当前层后代读取的完整 Theme */
  theme: CanonicalTheme;
  /** 当前层及后代注册的全局 layout 对象，供 Scope 收尾时原位升级到最终几何 */
  publicationSink: Array<CompiledNodeLayout>;
  /** 当前层自动 viewBox 几何贡献；Scope 收尾后再投到父 frame */
  boundsSink: Array<LayoutBoundsContribution>;
  /** 当前层父布局 allocation 几何贡献 */
  allocationSink: Array<LayoutBoundsContribution>;
  /** 当前层 descendant alignment guide 贡献 */
  alignmentGuideSink: Array<LayoutAlignmentGuide>;
  /** 最近一层显式 composite allocation boundary */
  allocationBoundary?: object;
  /** 最终逻辑树 artifact 输出容器 */
  artifactSink: Array<CompositeArtifact>;
  /** 当前 frame 的编译来源 */
  semanticOwner?: CompileOwnerKey;
};

export type NodeChild = Extract<IRChild, { type: 'node' }>;

export type CoordinateChild = Extract<IRChild, { type: 'coordinate' }>;

export type ScopeChild = Extract<IRChild, { type: 'scope' }>;

export type PathChild = Extract<IRChild, { type: 'path' }>;

/** scope.id layout 占位注册结果 */
export type ScopeLayoutPlaceholder = {
  /** scope.id 所在父 namespace frame 深度 */
  parentFrameDepth: number;
  /** scope.id 初始占位 layout；无 id 时不存在 */
  placeholderLayout?: CompiledNodeLayout;
};

/** 创建 Scope 布局占位项所需的遍历位置与父帧 */
export type ScopeLayoutPlaceholderContext = {
  /** 当前作用域在父层子项中的索引 */
  index: number;
  /** 登记占位布局所使用的父遍历帧 */
  frame: TraversalFrame;
};

/** 将已编译的 Scope 子树封装为场景分组所需的坐标、裁剪与身份上下文 */
export type EmitScopeGroupContext = {
  /** 当前作用域在父层子项中的索引 */
  index: number;
  /** 施加于该作用域场景分组的变换链 */
  scopeTransforms: ReadonlyArray<Transform>;
  /** 已收集的作用域子图元及待回填占位项 */
  scopePrimitiveSink: Array<InternalScenePrimitive>;
  /** 接收作用域输出和布局贡献的父遍历帧 */
  frame: TraversalFrame;
  /** runtime Scope 预检阶段已生成且尚未登记的裁剪路径 */
  resolvedClipPath?: SceneClipPath;
  /** Scope child 的 semantic owner */
  semanticOwner?: CompileOwnerKey;
};

/** 自动 viewBox 的当前 frame 几何贡献 */
type LayoutBoundsContribution = {
  /** 包络装饰的可见范围，需要沿祖先裁剪收敛 */
  decoration?: true;
  /** 当前 frame 中的几何点 */
  boundsPoints: Array<IRPosition>;
  /** 与该点集关联的阴影外溢 */
  shadow?: CanonicalDropShadow;
  /** 位于该显式 composite allocation boundary 内时不直接贡献到外层 */
  allocationBoundary?: object;
};
