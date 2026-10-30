import type { PropertyPath } from '@retikz/foundation';
import type { AxisAlignedBounds } from '@retikz/math';

import type {
  CompileOccurrenceLocator,
  LayoutAlignmentGuide,
  LayoutContribution,
  LayoutMeasurementAxis,
  LayoutProposal,
  SceneClipPath,
  ScenePrimitive,
  Transform,
} from '../../contract';
import type { CompositeInputScope } from '../../contract/composite';
import type { MergedScopeDefaults } from '../../resolve';
import type { CanonicalDropShadow, IRChild, IRPosition } from '../../schemas';
import type { CanonicalTheme } from '../../shared';
import type { FullCompileContext, SharedCompileContext, WorkspaceCompileContext } from '../context';
import type { NamespaceStack } from '../namespace';
import type { CompiledNodeLayout } from '../node';
import type { InputPathCompilation } from '../path';
import type { CompileOwnerKey, CompileProvenanceTracker } from '../provenance';
import type { ScopeTransformComposer } from '../transform';
import type { CompositeArtifact } from '../types';
import type { CompositeCompileSession } from './composite/session';
import type { InternalScenePrimitive, PathPlaceholder } from './primitive';

/** 等待命名引用完成注册后再 emit 的 path 任务 */
export type PendingPathEmission = InputPathCompilation & {
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
  /** 产生 path primitive 的语义 owner */
  semanticOwner?: CompileOwnerKey;
  /** 编译期排序用 zIndex，不写入 Scene primitive */
  zIndex?: number;
};

/** child 遍历编译后的 primitive 与自动 layout bbox */
export type SubtreeCompilation = {
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
  /** 当前子树最终逻辑树的 artifacts */
  artifacts: Array<CompositeArtifact>;
  /** 顶层 child 向父布局暴露的无歧义 alignment guides */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
};

/** 子树调度继承的初始位置和执行策略，不持有工作区或会话 */
export type ScopeCompileOptions = {
  /** 仅作用于本次执行根组件的需求 */
  measurementAxis?: LayoutMeasurementAxis;
  /** 查询 probe 在 Scope 出栈前读取最终引用环境，不向公共 context 暴露可变状态 */
  captureScopeTargets?: (child: ScopeChild, namespace: NamespaceStack, chain: ReadonlyArray<Transform>) => void;
  /** 当前执行是否为 layoutChild 隔离 probe */
  probe?: boolean;
  /** probe 继承的当前 scope chain */
  scopeChain?: ReadonlyArray<Transform>;
  /** probe 继承的有效默认配置 */
  scopeDefaults?: MergedScopeDefaults;
  /** 当前 child 根 occurrence；省略时按 canonical IR path 分配 */
  occurrence?: CompileOccurrenceLocator;
  /** 当前执行的 composite 深度 */
  compositeDepth?: number;
  /** root child 是否来自 provider 输入 / 输出 */
  generated?: boolean;
  /** 当前 root child 收到的完整双轴 proposal */
  proposal?: LayoutProposal;
};

/** 执行入口接收的隔离状态，管理器建立环境后只传递调度所需选项 */
export type SubtreeCompileOptions = ScopeCompileOptions & {
  /** probe 继承的 namespace snapshot */
  namespaceStack?: NamespaceStack;
  /** 按需收集同次编译来源 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 向隔离 namespace callback 暴露当前 warning occurrence */
  observeWarningOccurrence?: (occurrence: CompileOccurrenceLocator | undefined) => void;
};

/** 单次子树执行共享的依赖和操作；隔离 probe 创建独立上下文 */
export type CompileExecutionContext = {
  /** 跨执行共享的编译能力 */
  shared: SharedCompileContext;
  /** 当前执行独占的资源与诊断工作区 */
  workspace: WorkspaceCompileContext;
  /** 当前执行的名称注册与查找栈 */
  namespaceStack: NamespaceStack;
  /** 可选的编译来源收集器 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 顶层编译与隔离 probe 共享的组件会话 */
  compositeSession: CompositeCompileSession;
  /** 当前执行独占的变换组合缓存 */
  scopeTransformComposer: ScopeTransformComposer;
  /** 在执行期间绑定诊断来源，退出时恢复父来源 */
  withWarningOccurrence: WithCompileWarningOccurrence;
};

/** 子树执行策略与初始继承值，不持有工作区或宿主操作 */
export type ScopeCompilerOptions = Pick<ScopeCompileOptions, 'probe' | 'measurementAxis' | 'captureScopeTargets'> & {
  /** 进入遍历前的继承位置与输入，递归时派生为局部帧 */
  initial: Omit<ScopeCompileOptions, 'probe' | 'measurementAxis' | 'captureScopeTargets'> &
    Pick<FullCompileContext, 'theme' | 'compositeInputs'>;
};

/** 递归处理一层 child 时的上下文 */
export type ScopeCompileFrame = {
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

/** 选中隔离子树后交给宿主接受的局部输出，不包含可写工作区或递归调度器 */
export type ScopeOutputContribution = {
  /** 已完成资源重映射及包装的图元 */
  primitives: Array<ScenePrimitive>;
  /** 与图元一一对应的编译期排序值 */
  primitiveZIndices: ReadonlyArray<number | undefined>;
  /** 当前局部坐标系中的布局 */
  layouts: Array<CompiledNodeLayout>;
  /** 已完成命名提交的全局布局，供祖先收尾投影 */
  publications: Array<CompiledNodeLayout>;
  /** 可见边界贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** 父布局分配贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 重新绑定输出位置的领域产物 */
  artifacts: Array<CompositeArtifact>;
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
  frame: ScopeCompileFrame;
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
  frame: ScopeCompileFrame;
  /** runtime Scope 预检阶段已生成且尚未登记的裁剪路径 */
  resolvedClipPath?: SceneClipPath;
  /** Scope child 的 semantic owner */
  semanticOwner?: CompileOwnerKey;
};

/** 自动 viewBox 的当前 frame 几何贡献 */
export type LayoutBoundsContribution = {
  /** 包络装饰的可见范围，需要沿祖先裁剪收敛 */
  decoration?: true;
  /** 当前 frame 中的几何点 */
  boundsPoints: Array<IRPosition>;
  /** 与该点集关联的阴影外溢 */
  shadow?: CanonicalDropShadow;
  /** 位于该显式 composite allocation boundary 内时不直接贡献到外层 */
  allocationBoundary?: object;
};

/** 在同步计算或延迟输出期间绑定诊断来源，退出时恢复父来源 */
export type WithCompileWarningOccurrence = <T>(occurrence: CompileOccurrenceLocator, execute: () => T) => T;

/** 使用独占工作区与名称环境执行子树；实现由全量会话持有 */
export type CompileSubtree = (
  children: ReadonlyArray<IRChild>,
  options: SubtreeCompileOptions,
  context: FullCompileContext,
) => SubtreeCompilation;

/** 子树编译器所需的宿主调度能力，不暴露具体管理器 */
export type ScopeCompileHost = {
  /** 在同一会话内执行隔离子树 */
  compileSubtree: CompileSubtree;
};
