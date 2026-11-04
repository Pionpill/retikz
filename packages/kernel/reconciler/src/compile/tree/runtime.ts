import type {
  CompiledReferenceGeometry,
  CompositeInputScope,
  LayoutAlignmentGuide,
  LayoutBoundsContribution,
  LayoutProposal,
  CanonicalScopeInheritance,
  Transform,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../provenance';
import type { CompositeArtifact } from '../shared';
import type { PendingPathEmission } from './path/deferred';
import type { InternalScenePrimitive } from './shared/output';

/** 当前递归子树的继承环境和布局输入 */
export type SubtreeCompileContext = Readonly<{
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
