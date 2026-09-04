import type { infer as ZodInfer, ZodType } from 'zod';

import { PositionSchema } from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutArtifactRectSchema } from '@retikz/layout';
import { array, discriminatedUnion, lazy, literal, strictObject, union } from 'zod';

import { FlowRoutingKind } from '../../shared';

export const FlowArtifactBoundsSchema = strictObject({
  allocationBounds: LayoutArtifactRectSchema.describe('Final allocation rectangle in Flow-local coordinates.'),
  visualBounds: LayoutArtifactRectSchema.describe('Conservative visual rectangle in Flow-local coordinates.'),
}).describe('Allocation and visual bounds for one Flow frame or region.');

export const FlowLeafArtifactSchema = strictObject({
  id: NonBlankStringSchema.describe('Authored Flow element identity.'),
  kind: literal('entity').describe('Flow Entity artifact discriminator.'),
  bounds: LayoutArtifactRectSchema.describe('Final element layout bounds in Flow-local coordinates.'),
}).describe('Final layout geometry for one Flow leaf element.');

/** 递归 Flow Group artifact schema 的显式输出类型 */
type FlowGroupArtifactSchemaOutput = Readonly<{
  id: string;
  kind: 'group';
  bounds: ZodInfer<typeof LayoutArtifactRectSchema>;
  elements: Array<FlowElementArtifactSchemaOutput>;
}>;

type FlowLayoutArtifactSchemaOutput = Readonly<{
  id: string;
  kind: 'layout';
  bounds: ZodInfer<typeof LayoutArtifactRectSchema>;
  elements: Array<FlowElementArtifactSchemaOutput>;
}>;

/** Flow artifact 递归元素 schema 的显式输出联合 */
type FlowElementArtifactSchemaOutput =
  | ZodInfer<typeof FlowLeafArtifactSchema>
  | FlowGroupArtifactSchemaOutput
  | FlowLayoutArtifactSchemaOutput;

export const FlowElementArtifactSchema: ZodType<FlowElementArtifactSchemaOutput> = lazy(() =>
  union([FlowLeafArtifactSchema, FlowGroupArtifactSchema, FlowLayoutArtifactSchema]),
);

const FlowArtifactScopeShape = {
  id: NonBlankStringSchema.describe('Authored Flow scope identity.'),
  bounds: LayoutArtifactRectSchema.describe('Final scope layout bounds in Flow-local coordinates.'),
  elements: array(FlowElementArtifactSchema).nonempty().describe('Non-empty recursive authored containment tree.'),
};

export const FlowGroupArtifactSchema: ZodType<FlowGroupArtifactSchemaOutput> = strictObject({
  ...FlowArtifactScopeShape,
  kind: literal('group').describe('Flow Group artifact discriminator.'),
}).describe('Final layout geometry and authored semantics for one recursive Flow Group.');

export const FlowLayoutArtifactSchema: ZodType<FlowLayoutArtifactSchemaOutput> = strictObject({
  ...FlowArtifactScopeShape,
  kind: literal('layout').describe('Flow Layout artifact discriminator.'),
}).describe('Final layout geometry for one recursive invisible Flow Layout.');

const FlowStraightRouteArtifactSchema = strictObject({
  kind: literal(FlowRoutingKind.Straight).describe('Straight Flow route discriminator.'),
  points: array(PositionSchema).min(2).describe('Canonical Flow-local straight point chain.'),
});

const FlowOrthogonalRouteArtifactSchema = strictObject({
  kind: literal(FlowRoutingKind.Orthogonal).describe('Orthogonal Flow route discriminator.'),
  cornerRadius: NonNegativeNumberSchema.describe('Effective rounded-corner radius in user units.'),
  points: array(PositionSchema).min(2).describe('Canonical Flow-local orthogonal point chain.'),
});

export const FlowRouteArtifactSchema = discriminatedUnion('kind', [
  FlowStraightRouteArtifactSchema,
  FlowOrthogonalRouteArtifactSchema,
]).describe('Canonical renderer-neutral Flow relation route.');

export const FlowRelationArtifactSchema = strictObject({
  source: NonBlankStringSchema.describe('Authored source Flow element identity.'),
  target: NonBlankStringSchema.describe('Authored target Flow element identity.'),
  route: FlowRouteArtifactSchema.describe('Final relation route in Flow-local coordinates.'),
  labelReservation: LayoutArtifactRectSchema.optional().describe('Optional reserved label rectangle.'),
}).describe('Final renderer-neutral geometry for one authored Flow Relation.');

export const FlowDiagramArtifactSchema = strictObject({
  layout: strictObject({
    definition: NonBlankStringSchema.describe('Flow Layout Definition that produced this geometry.'),
  }).describe('Layout provenance for this compile result.'),
  frame: FlowArtifactBoundsSchema.describe('Final Diagram frame geometry.'),
  regions: strictObject({
    title: FlowArtifactBoundsSchema.optional().describe('Title region when authored.'),
    description: FlowArtifactBoundsSchema.optional().describe('Description region when authored.'),
    drawing: FlowArtifactBoundsSchema.describe('Required Flow drawing region.'),
    legend: FlowArtifactBoundsSchema.optional().describe('Legend region when authored.'),
  }).describe('Only the Diagram regions present in this compile result.'),
  elements: array(FlowElementArtifactSchema).nonempty().describe('Recursive authored Flow element geometry.'),
  relations: array(FlowRelationArtifactSchema).describe('Authored root relations in Source order.'),
}).describe('Renderer-neutral Flow Diagram artifact in one Flow-local coordinate system.');
