import type {
  CanonicalScopeInheritance,
  CompileOccurrenceLocator,
  CompiledReferenceGeometry,
  CompositeInputScope,
  IRChild,
  IRScope,
  LayoutAlignmentGuide,
  LayoutBoundsContribution,
  LayoutContribution,
  LayoutMeasurementAxis,
  LayoutProposal,
  MergedScopeDefaults,
  ScenePrimitive,
  Transform,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import type { AxisAlignedBounds } from '@retikz/math';

import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime, NamespaceStack } from '../../runtime';
import type { CompositeArtifact } from '../../shared';
import type { PendingPathEmission } from '../leaf';
import type { InternalScenePrimitive } from '../shared';
import { CompileElementExecutor } from './element';

/** 子树向父布局提供的尺寸、占位与对齐信息 */
type LayoutCompilation = {
  /** 根组件按请求轴直接返回的尺寸贡献 */
  contribution?: LayoutContribution;
  /** 顶层子项参与父布局的占位几何贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 顶层子项向父布局提供的无歧义对齐参考 */
  alignmentGuides?: ReadonlyArray<LayoutAlignmentGuide>;
};

/** 子树编译后的绘制输出、可见边界与父布局信息 */
export type SubtreeCompilation = {
  /** 供父布局测量和排列子树的信息 */
  layout: LayoutCompilation;
  /** 已完成排序和占位回填的 Scene primitive */
  primitives: Array<ScenePrimitive>;
  /** 与 primitives 对齐的父层 zIndex，仅供同一次 compile 内 replay 复用 */
  primitiveZIndices: Array<number | undefined>;
  /** 用于自动 viewBox 的可见内容轴对齐包围盒 */
  visualBounds: AxisAlignedBounds | undefined;
  /** 顶层 child 对父 Scope 的 allocation layout 贡献 */
  geometries: Array<CompiledReferenceGeometry>;
  /** 顶层自动 layout 几何贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** 当前子树最终逻辑树的 artifacts */
  artifacts: Array<CompositeArtifact>;
};

/** 子树调度继承的初始位置和执行策略，不持有工作区或会话 */
export type SubtreeCompileOptions = {
  /** 仅作用于本次执行根组件的需求 */
  measurementAxis?: LayoutMeasurementAxis;
  /** 查询 probe 在 Scope 出栈前读取最终引用环境，不向公共 context 暴露可变状态 */
  captureScopeTargets?: (child: IRScope, namespace: NamespaceStack, chain: ReadonlyArray<Transform>) => void;
  /** 当前执行是否为 layoutChild 隔离 probe */
  probe?: boolean;
  /** probe 继承的当前 scope chain */
  transformChains?: ReadonlyArray<Transform>;
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

/** 选中隔离子树后交给宿主接受的局部输出，不包含可写工作区或递归调度器 */
export type SubtreeOutputContribution = {
  /** 已完成重放实例化及包装的图元 */
  primitives: Array<ScenePrimitive>;
  /** 与图元一一对应的编译期排序值 */
  primitiveZIndices: ReadonlyArray<number | undefined>;
  /** 当前局部坐标系中的布局 */
  geometries: Array<CompiledReferenceGeometry>;
  /** 已完成命名提交的全局布局，供祖先收尾投影 */
  publications: Array<CompiledReferenceGeometry>;
  /** 可见边界贡献 */
  bounds: Array<LayoutBoundsContribution>;
  /** 父布局分配贡献 */
  allocations: Array<LayoutBoundsContribution>;
  /** 重新绑定输出位置的领域产物 */
  artifacts: Array<CompositeArtifact>;
};

/** 使用独占工作区与名称环境执行子树；实现由全量会话持有 */
type CompileSubtree = (
  children: ReadonlyArray<IRChild>,
  runtime: CompileRuntime,
  options: SubtreeCompileOptions,
) => SubtreeCompilation;

/** 子树编译器所需的宿主调度能力，不暴露具体管理器 */
export type SubtreeCompileHost = {
  /** 在同一会话内执行隔离子树 */
  compileSubtree: CompileSubtree;
};

/** 当前递归子树的继承环境和布局输入 */
type SubtreeCompileContext = Readonly<{
  /** 当前原始 Source 子树及其组件运行时输入绑定，生成的普通 child 不继承 */
  compositeInput?: CompositeInputScope;
  /** 子树的布局约束与父布局占位策略，省略时使用默认行为 */
  layout?: Readonly<{
    /** 当前子树接收的父布局约束，普通 Scope 会继续透传 */
    childProposal?: LayoutProposal;
    /** 祖先组件已显式声明占位时，跳过内部贡献的父布局占位汇总，不影响实际几何边界 */
    skipAllocation?: boolean;
  }>;
  /** 当前 scope 累计变换 */
  transformChains: ReadonlyArray<Transform>;
  /** 当前层声明路径前缀 */
  pathPrefix: PropertyPath;
  /** 有效默认配置与主题 */
  inheritance: CanonicalScopeInheritance;
  /** 当前子树的编译溯源归属标识，仅在开启来源追踪时提供 */
  compileOwner?: CompileOwnerKey;
}>;

/** 当前递归子树正在构建的输出与延迟任务 */
export type SubtreeCompileState = Readonly<{
  /** 用于组装 Scene 的图元及待回填的路径占位项 */
  primitives: Array<InternalScenePrimitive>;
  /** 用于计算当前 Scope 包络及相关变换的子元素布局 */
  geometries: Array<CompiledReferenceGeometry>;
  /** 等待命名目标和 Scope 几何确定后执行的路径编译任务 */
  paths: Array<PendingPathEmission>;
  /** 供祖先 Scope 补齐变换并更新命名空间绑定的已发布布局 */
  publications: Array<CompiledReferenceGeometry>;
  /** 用于计算整体边界和自动 viewBox 的几何贡献，包含附属 label 和阴影 */
  bounds: Array<LayoutBoundsContribution>;
  /** 用于父布局测量的占位贡献，默认不额外计入 Node 附属 label 和阴影 */
  allocations: Array<LayoutBoundsContribution>;
  /** 用于布局对齐的参考线，如文字基线 */
  alignmentGuides: Array<LayoutAlignmentGuide>;
  /** 汇入最终编译结果、供调用方读取的 Composite 领域产物 */
  artifacts: Array<CompositeArtifact>;
}>;

/** 当前递归子树的输入环境与收集状态 */
export type SubtreeCompileRuntime = Readonly<{
  /** 当前子树的稳定输入 */
  context: SubtreeCompileContext;
  /** 当前子树的可变收集容器 */
  state: SubtreeCompileState;
}>;

/** 完整编译根或隔离子树；工作区由调用方提供，作者增量树由 Weave 调度 */
export const assembleCompileSubtree = (
  children: ReadonlyArray<IRChild>,
  runtime: CompileRuntime,
  options: SubtreeCompileOptions = {},
): SubtreeCompilation => {
  const executor = new CompileElementExecutor(children, runtime, {
    ...options,
    compileSubtree: assembleCompileSubtree,
  });
  const frame = executor.createRootFrame();
  executor.compileChildren(children, frame, true);
  return executor.finish(frame.state);
};
