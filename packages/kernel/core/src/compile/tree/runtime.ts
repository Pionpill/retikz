import type { PropertyPath } from '@retikz/foundation';

import type { LayoutAlignmentGuide, LayoutProposal, Transform, CompositeInputScope } from '../../contract';
import type { CompiledNodeLayout, LayoutBoundsContribution } from '../layout';
import type { CompileOwnerKey } from '../provenance';
import type { CompileStyle } from '../runtime';
import type { CompositeArtifact } from '../shared';
import type { InternalScenePrimitive } from './output';
import type { PendingPathEmission } from './path/deferred';

/** 当前递归子树的继承环境和布局输入 */
export type SubtreeCompileContext = Readonly<{
  /** 当前 Source 容器的实例输入，生成的普通 child 不继承 */
  runtimeInputs?: CompositeInputScope;
  /** 只供直接 child 消费的父布局约束 */
  childProposal?: LayoutProposal;
  /** 当前 scope 累计变换 */
  scopeChain: ReadonlyArray<Transform>;
  /** 当前层声明路径前缀 */
  locatorPrefix: PropertyPath;
  /** 有效默认配置与主题 */
  style: CompileStyle;
  /** 最近一层显式组件分配边界 */
  allocationBoundary?: object;
  /** 当前子树的编译来源 */
  semanticOwner?: CompileOwnerKey;
}>;

/** 当前递归子树正在构建的输出与延迟任务 */
export type SubtreeCompileState = Readonly<{
  /** 当前层图元 */
  primitiveSink: Array<InternalScenePrimitive>;
  /** 向父 scope 汇报的布局 */
  layoutSink: Array<CompiledNodeLayout>;
  /** 当前层延迟发射的路径任务 */
  pathSink: Array<PendingPathEmission>;
  /** Scope 收尾时升级为最终几何的已发布布局 */
  publicationSink: Array<CompiledNodeLayout>;
  /** 自动视口的几何贡献 */
  boundsSink: Array<LayoutBoundsContribution>;
  /** 父布局的分配几何贡献 */
  allocationSink: Array<LayoutBoundsContribution>;
  /** 后代对齐参考线贡献 */
  alignmentGuideSink: Array<LayoutAlignmentGuide>;
  /** 最终逻辑树产物 */
  artifactSink: Array<CompositeArtifact>;
}>;

/** 当前递归子树的输入环境与收集状态 */
export type SubtreeCompileRuntime = Readonly<{
  /** 当前子树的稳定输入 */
  context: SubtreeCompileContext;
  /** 当前子树的可变收集容器 */
  state: SubtreeCompileState;
}>;

/** 为一层子树创建独立的输出收集容器 */
export const createSubtreeCompileState = (): SubtreeCompileState => ({
  primitiveSink: [],
  layoutSink: [],
  pathSink: [],
  publicationSink: [],
  boundsSink: [],
  allocationSink: [],
  alignmentGuideSink: [],
  artifactSink: [],
});
