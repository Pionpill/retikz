import type { IRFlowDiagram, IRFlowEntity, IRFlowGroup, IRFlowLayout, IRFlowRelation } from '@retikz/diagram/flow';

/** Flow Entity 的 Vanilla authoring 输入 */
export type InputFlowEntity = IRFlowEntity;

/** Flow Group 的 Vanilla authoring 输入 */
export type InputFlowGroup = IRFlowGroup;

/** Flow Layout 的 Vanilla authoring 输入 */
export type InputFlowLayout = IRFlowLayout;

/** Flow Relation 的 Vanilla authoring 输入 */
export type InputFlowRelation = IRFlowRelation;

/** 省略固定根判别字段的 Flow Diagram Vanilla authoring 输入 */
export type InputFlowDiagram = Omit<IRFlowDiagram, 'namespace' | 'type'>;
