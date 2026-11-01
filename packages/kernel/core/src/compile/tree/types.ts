import type { AxisAlignedBounds } from '@retikz/math';

import type {
  CompileOccurrenceLocator,
  LayoutAlignmentGuide,
  LayoutContribution,
  LayoutMeasurementAxis,
  LayoutProposal,
  ScenePrimitive,
  Transform,
} from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import type { CanonicalDropShadow, IRChild, IRPosition } from '../../schemas';
import type { CompileProvenanceTracker } from '../provenance';
import type { CompositeArtifact } from '../shared';
import type { FullCompileContext } from './context';
import type { NamespaceStack } from './namespace';
import type { CompiledNodeLayout } from './node';

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
export type SubtreeInitialOptions = {
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
export type SubtreeCompileOptions = SubtreeInitialOptions & {
  /** probe 继承的 namespace snapshot */
  namespaceStack?: NamespaceStack;
  /** 按需收集同次编译来源 */
  provenanceTracker?: CompileProvenanceTracker;
  /** 向隔离 namespace callback 暴露当前 warning occurrence */
  observeWarningOccurrence?: (occurrence: CompileOccurrenceLocator | undefined) => void;
};

/** 子树执行策略与初始继承值，不持有工作区或宿主操作 */
export type SubtreeCompilerOptions = Pick<
  SubtreeInitialOptions,
  'probe' | 'measurementAxis' | 'captureScopeTargets'
> & {
  /** 进入遍历前的继承位置与输入，递归时派生为局部帧 */
  initial: Omit<SubtreeInitialOptions, 'probe' | 'measurementAxis' | 'captureScopeTargets'> &
    Pick<FullCompileContext, 'theme' | 'compositeInputs'>;
};

/** 选中隔离子树后交给宿主接受的局部输出，不包含可写工作区或递归调度器 */
export type SubtreeOutputContribution = {
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

/** 使用独占工作区与名称环境执行子树；实现由全量会话持有 */
export type CompileSubtree = (
  children: ReadonlyArray<IRChild>,
  options: SubtreeCompileOptions,
  context: FullCompileContext,
) => SubtreeCompilation;

/** 子树编译器所需的宿主调度能力，不暴露具体管理器 */
export type SubtreeCompileHost = {
  /** 在同一会话内执行隔离子树 */
  compileSubtree: CompileSubtree;
};
