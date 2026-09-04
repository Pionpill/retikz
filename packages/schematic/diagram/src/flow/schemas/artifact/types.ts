import type { CompositeCompileArtifact } from '@retikz/core';
import type { infer as ZodInfer } from 'zod';

import type {
  FlowArtifactBoundsSchema,
  FlowDiagramArtifactSchema,
  FlowElementArtifactSchema,
  FlowGroupArtifactSchema,
  FlowLayoutArtifactSchema,
  FlowLeafArtifactSchema,
  FlowRelationArtifactSchema,
  FlowRouteArtifactSchema,
} from './schema';

/** Flow frame 或 region 的分配边界与可见边界 */
export type FlowArtifactBounds = ZodInfer<typeof FlowArtifactBoundsSchema>;

/** 单个 Flow Entity 的最终布局几何 */
export type FlowLeafArtifact = ZodInfer<typeof FlowLeafArtifactSchema>;

/** 单个递归 Flow Group 的最终布局几何 */
export type FlowGroupArtifact = ZodInfer<typeof FlowGroupArtifactSchema>;

/** 单个递归 Flow Layout 的最终布局几何 */
export type FlowLayoutArtifact = ZodInfer<typeof FlowLayoutArtifactSchema>;

/** Flow Entity、Flow Group 与 Flow Layout 的最终布局几何联合 */
export type FlowElementArtifact = ZodInfer<typeof FlowElementArtifactSchema>;

/** Flow Relation 的 renderer-neutral 规范路由 */
export type FlowRouteArtifact = ZodInfer<typeof FlowRouteArtifactSchema>;

/** 单个 Flow Relation 的最终 renderer-neutral 几何 */
export type FlowRelationArtifact = ZodInfer<typeof FlowRelationArtifactSchema>;

/** 单次 Flow Diagram 编译产生的 renderer-neutral artifact */
export type FlowDiagramArtifact = ZodInfer<typeof FlowDiagramArtifactSchema>;

/** Core 编译结果中的 Flow Diagram typed artifact envelope */
export type FlowDiagramCompileArtifact = CompositeCompileArtifact<'diagram', 'flow', FlowDiagramArtifact>;
