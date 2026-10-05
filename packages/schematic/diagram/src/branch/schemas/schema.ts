import { NodeSchema, NodeLabelSchema, NodeLayoutSchema, ScopePropsSchema, PositionSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { RelationSchema } from '@retikz/graph';
import { LayoutArtifactRectSchema } from '@retikz/layout';
import { array, literal, strictObject, enum as zodEnum, number } from 'zod';

import { DiagramDefaultsSchema, DiagramFrameSchema, DiagramPresentationSchema } from '../../_diagram';

/** 校验分支推进方向及节点、泳道之间的净间距 */
export const BranchLayoutIntentSchema = strictObject({
  direction: zodEnum(['right', 'left', 'down', 'up']).default('right').describe('Logical progression direction.'),
  nodeGap: NonNegativeNumberSchema.default(48).describe('Net progression gap including outside labels.'),
  laneGap: NonNegativeNumberSchema.default(48).describe('Net lane gap including outside labels.'),
}).describe('Provider-neutral Branch layout intent.');

/** 校验分支标记尺寸，不包含正文内边距或连线外边距 */
export const BranchNodeLayoutSchema = NodeLayoutSchema.pick({ width: true, minimumSize: true })
  .extend({
    minimumSize: NodeLayoutSchema.shape.minimumSize.unwrap().default(10),
  })
  .describe('Marker dimensions without body padding or connection margin.');

/** 校验由布局定位的分支节点标记及其外部标签 */
export const BranchNodeSchema = strictObject({
  id: NonBlankStringSchema.describe('Unique authored node identity.'),
  shape: NodeSchema.shape.shape.default('circle'),
  boundary: NodeSchema.shape.boundary,
  cornerRadius: NodeSchema.shape.cornerRadius,
  style: NodeSchema.shape.style,
  meta: NodeSchema.shape.meta,
  labels: array(NodeLabelSchema).optional().describe('Outside labels using Core Node label semantics.'),
  layout: BranchNodeLayoutSchema.optional().describe('Marker size overrides.'),
}).describe('Branch marker without body text or authored position.');

/** 校验共享节点的有序引用，相邻引用定义一条连接 */
export const BranchSchema = strictObject({
  id: NonBlankStringSchema.describe('Authored branch path identity; independent of node identities.'),
  nodes: array(NonBlankStringSchema)
    .nonempty()
    .describe('Ordered node references; adjacent entries imply a connection.'),
  style: RelationSchema.shape.style,
}).describe('An ordered path through shared Branch nodes.');

/** 校验以有序分支路径定义拓扑的分支图输入 */
export const BranchDiagramSchema = strictObject({
  namespace: literal('diagram'),
  type: literal('branch'),
  ...ScopePropsSchema.shape,
  nodes: array(BranchNodeSchema).nonempty().describe('Flat node catalog in stable tie-breaking order.'),
  branches: array(BranchSchema).nonempty().describe('Ordered branch paths.'),
  mainBranch: NonBlankStringSchema.optional().describe('Declared branch whose nodes remain on one lane.'),
  layout: BranchLayoutIntentSchema.optional(),
  presentation: DiagramPresentationSchema.optional(),
  frame: DiagramFrameSchema.optional(),
  diagramDefaults: DiagramDefaultsSchema.optional(),
}).describe('Branch diagram with ordered paths as the only topology source.');

const BranchArtifactBoundsSchema = strictObject({
  allocationBounds: LayoutArtifactRectSchema,
  visualBounds: LayoutArtifactRectSchema,
});

/** 校验组装后分配区域局部坐标中的节点、路径及展示区域几何 */
export const BranchDiagramArtifactSchema = strictObject({
  layout: strictObject({ definition: NonBlankStringSchema }).describe('Selected layout definition.'),
  frame: BranchArtifactBoundsSchema.describe('Bounds of the complete diagram.'),
  regions: strictObject({
    title: BranchArtifactBoundsSchema.optional(),
    description: BranchArtifactBoundsSchema.optional(),
    drawing: BranchArtifactBoundsSchema,
    legend: BranchArtifactBoundsSchema.optional(),
  }).describe('Bounds of the title, description, drawing, and legend regions.'),
  nodes: array(
    strictObject({
      id: NonBlankStringSchema,
      position: PositionSchema,
      lane: number().int().nonnegative(),
      markerBounds: LayoutArtifactRectSchema,
      visualBounds: LayoutArtifactRectSchema,
    }),
  ).describe('Unique geometry for each shared node.'),
  segments: array(
    strictObject({
      source: NonBlankStringSchema,
      target: NonBlankStringSchema,
      points: array(PositionSchema).min(2),
      cornerRadius: NonNegativeNumberSchema,
    }),
  ).describe('Reference routes; boundary clipping and rounded commands belong to Core Scene.'),
  branches: array(strictObject({ id: NonBlankStringSchema, segments: array(number().int().nonnegative()) })).describe(
    'Adjacent segment indexes for each authored branch.',
  ),
}).describe('Branch layout result in assembled allocation-local coordinates.');
