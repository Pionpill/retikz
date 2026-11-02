import type { PropertyPath } from '@retikz/foundation';

import type { LayoutAlignmentGuide, LayoutProposal, Transform, CompositeInputScope } from '../../contract';
import type { MergedScopeDefaults } from '../../resolve';
import type { CanonicalTheme } from '../../shared';
import type { CompiledNodeLayout, LayoutBoundsContribution } from '../layout';
import type { CompileOwnerKey } from '../provenance';
import type { CompositeArtifact } from '../shared';
import type { InternalScenePrimitive } from './output';
import type { PendingPathEmission } from './path/deferred';

/** 递归处理一层 child 时的上下文 */
export type TreeCompileFrame = {
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

/** 为一层子树创建独立的输出收集容器 */
export const createCompileSinks = (): Pick<
  TreeCompileFrame,
  | 'primitiveSink'
  | 'layoutSink'
  | 'pathSink'
  | 'publicationSink'
  | 'boundsSink'
  | 'allocationSink'
  | 'alignmentGuideSink'
  | 'artifactSink'
> => ({
  primitiveSink: [],
  layoutSink: [],
  pathSink: [],
  publicationSink: [],
  boundsSink: [],
  allocationSink: [],
  alignmentGuideSink: [],
  artifactSink: [],
});
