import type { infer as ZodInfer } from 'zod';

import type { FlowEndpointSchema, FlowEndpointTargetSchema } from './schema';
import type {
  FlowDefaultsEntitySchema,
  FlowDefaultsGroupCaptionSchema,
  FlowDefaultsGroupCaptionTextSchema,
  FlowDefaultsGroupSchema,
  FlowDefaultsLayoutSchema,
  FlowDefaultsRelationSchema,
  FlowDefaultsSchema,
  FlowDiagramSchema,
  FlowEntityLayoutSchema,
  FlowEntitySchema,
  FlowEntityStyleSchema,
  FlowGroupSchema,
  FlowLayoutIntentSchema,
  FlowLayoutSchema,
  FlowRelationSchema,
  FlowRelationStyleSchema,
  FlowRoutingSchema,
} from './schema';

/** Flow Relation 的 provider-neutral 路由意图 */
export type IRFlowRouting = ZodInfer<typeof FlowRoutingSchema>;

/** 单个 Flow 布局作用域的稀疏布局意图 */
export type IRFlowLayoutIntent = ZodInfer<typeof FlowLayoutIntentSchema>;

/** 单个 Flow Entity 的绘制样式覆盖 */
export type IRFlowEntityStyle = ZodInfer<typeof FlowEntityStyleSchema>;

/** 单个 Flow Entity 的尺寸、边距与文本布局覆盖 */
export type IRFlowEntityLayout = ZodInfer<typeof FlowEntityLayoutSchema>;

/** 单个 Flow Relation 的路径样式覆盖 */
export type IRFlowRelationStyle = ZodInfer<typeof FlowRelationStyleSchema>;

/** Flow defaults 的布局间距片段 */
export type IRFlowDefaultsLayout = ZodInfer<typeof FlowDefaultsLayoutSchema>;

/** Flow defaults 的 Entity 片段 */
export type IRFlowDefaultsEntity = ZodInfer<typeof FlowDefaultsEntitySchema>;

/** Flow defaults 的 Group caption 文本格式片段 */
export type IRFlowDefaultsGroupCaptionText = ZodInfer<typeof FlowDefaultsGroupCaptionTextSchema>;

/** Flow defaults 的 Group caption 片段 */
export type IRFlowDefaultsGroupCaption = ZodInfer<typeof FlowDefaultsGroupCaptionSchema>;

/** Flow defaults 的 Group 片段 */
export type IRFlowDefaultsGroup = ZodInfer<typeof FlowDefaultsGroupSchema>;

/** Flow defaults 的 Relation 片段 */
export type IRFlowDefaultsRelation = ZodInfer<typeof FlowDefaultsRelationSchema>;

/** Flow 的 Source-derived 稀疏默认片段 */
export type IRFlowDefaults = ZodInfer<typeof FlowDefaultsSchema>;

/** Flow Entity 的持久化 Source IR */
export type IRFlowEntity = ZodInfer<typeof FlowEntitySchema>;

/** 通过 children 引用直接成员的 Flow Group 持久化 Source IR */
export type IRFlowGroup = ZodInfer<typeof FlowGroupSchema>;

/** 通过 children 引用直接成员的 Flow Layout 持久化 Source IR */
export type IRFlowLayout = ZodInfer<typeof FlowLayoutSchema>;

/** 按根级 relations 顺序标识的 Flow Relation 持久化 Source IR */
export type IRFlowRelation = ZodInfer<typeof FlowRelationSchema>;

/** Flow Diagram 的持久化 Source IR */
export type IRFlowDiagram = ZodInfer<typeof FlowDiagramSchema>;

/** 持久化关系端点约束 */
export type IRFlowEndpoint = ZodInfer<typeof FlowEndpointSchema>;

/** 编译结果中可直接交给 Core 的端点目标 */
export type FlowEndpointTarget = ZodInfer<typeof FlowEndpointTargetSchema>;
