import type { infer as ZodInfer } from 'zod';

import type {
  FlowDiagramSchema,
  FlowEntitySchema,
  FlowGroupSchema,
  FlowLayoutSchema,
  FlowRelationSchema,
} from './schema';

/** Flow Diagram 的持久化 Source IR */
export type IRFlowDiagram = ZodInfer<typeof FlowDiagramSchema>;

/** 单个 Flow Entity 的持久化 Source IR */
export type IRFlowEntity = ZodInfer<typeof FlowEntitySchema>;

/** 通过 children 引用直接成员的 Flow Group 持久化 Source IR */
export type IRFlowGroup = ZodInfer<typeof FlowGroupSchema>;

/** 通过 children 引用直接成员的 Flow Layout 持久化 Source IR */
export type IRFlowLayout = ZodInfer<typeof FlowLayoutSchema>;

/** 按根级 relations 顺序标识的 Flow Relation 持久化 Source IR */
export type IRFlowRelation = ZodInfer<typeof FlowRelationSchema>;
