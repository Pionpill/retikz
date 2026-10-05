import {
  BendAngleSchema,
  BendOutAngleSchema,
  BendInAngleSchema,
  BendLoosenessSchema,
  BendDirection,
  PositionSchema,
  SmoothTensionSchema,
} from '@retikz/core';
import { NonBlankStringSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutArtifactRectSchema } from '@retikz/layout';
import type { infer as ZodInfer, ZodType } from 'zod';
import { array, discriminatedUnion, lazy, literal, strictObject, union, tuple, enum as zodEnum } from 'zod';

import { FlowRoutingKind } from '../../shared';
import { FlowEndpointTargetSchema } from '../flow';
import { FlowOrthogonalRoutingSchema } from '../flow';

/** 校验 Flow 框架或区域的分配边界与保守可视边界 */
export const FlowArtifactBoundsSchema = strictObject({
  allocationBounds: LayoutArtifactRectSchema.describe('Final allocation rectangle in Flow-local coordinates.'),
  visualBounds: LayoutArtifactRectSchema.describe('Conservative visual rectangle in Flow-local coordinates.'),
}).describe('Allocation and visual bounds for one Flow frame or region.');

/** 校验 Flow 叶节点在局部坐标中的最终布局边界 */
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

/** 递归校验实体、可见分组及不可见布局容器的几何结果 */
export const FlowElementArtifactSchema: ZodType<FlowElementArtifactSchemaOutput> = lazy(() =>
  union([FlowLeafArtifactSchema, FlowGroupArtifactSchema, FlowLayoutArtifactSchema]),
);

const FlowArtifactScopeShape = {
  id: NonBlankStringSchema.describe('Authored Flow scope identity.'),
  bounds: LayoutArtifactRectSchema.describe('Final scope layout bounds in Flow-local coordinates.'),
  elements: array(FlowElementArtifactSchema).nonempty().describe('Non-empty recursive authored containment tree.'),
};

/** 校验可见 Flow 分组及其递归子元素的布局结果 */
export const FlowGroupArtifactSchema: ZodType<FlowGroupArtifactSchemaOutput> = strictObject({
  ...FlowArtifactScopeShape,
  kind: literal('group').describe('Flow Group artifact discriminator.'),
}).describe('Final layout geometry and authored semantics for one recursive Flow Group.');

/** 校验不可见 Flow 布局容器及其递归子元素的布局结果 */
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
  turnPosition: FlowOrthogonalRoutingSchema.shape.turnPosition,
  cornerRadius: NonNegativeNumberSchema.describe('Effective rounded-corner radius in user units.'),
  points: array(PositionSchema).min(2).describe('Canonical Flow-local orthogonal point chain.'),
});

const FlowPointRouteArtifactSchema = discriminatedUnion('kind', [
  FlowStraightRouteArtifactSchema,
  FlowOrthogonalRouteArtifactSchema,
  FlowOrthogonalRouteArtifactSchema.omit({ turnPosition: true }).extend({
    kind: literal(FlowRoutingKind.HorizontalThenVertical).describe(
      'Horizontal then vertical Flow route discriminator.',
    ),
  }),
  FlowOrthogonalRouteArtifactSchema.omit({ turnPosition: true }).extend({
    kind: literal(FlowRoutingKind.VerticalThenHorizontal).describe(
      'Vertical then horizontal Flow route discriminator.',
    ),
  }),
]).describe('Canonical renderer-neutral Flow relation route.');

const FlowBendRouteShape = {
  kind: literal('bend'),
  points: tuple([PositionSchema, PositionSchema]).describe('Two reference endpoint centers in Flow-local coordinates.'),
};

/** 校验仅使用一组有效参数的参考路由；边界裁剪与箭头缩短由 Core 完成 */
export const FlowRouteArtifactSchema = union([
  strictObject({
    kind: literal(FlowRoutingKind.Smooth),
    points: array(PositionSchema).min(3),
    tension: SmoothTensionSchema.unwrap(),
  }),
  strictObject({ kind: literal('curve'), points: tuple([PositionSchema, PositionSchema]), control: PositionSchema }),
  strictObject({
    kind: literal('cubic'),
    points: tuple([PositionSchema, PositionSchema]),
    control1: PositionSchema,
    control2: PositionSchema,
  }),
  FlowPointRouteArtifactSchema,
  strictObject({ ...FlowBendRouteShape, bendDirection: zodEnum(BendDirection), bendAngle: BendAngleSchema.unwrap() }),
  strictObject({
    ...FlowBendRouteShape,
    outAngle: BendOutAngleSchema.unwrap(),
    inAngle: BendInAngleSchema.unwrap(),
    looseness: BendLoosenessSchema.unwrap(),
  }),
]).describe(
  'Canonical reference route with exactly one active parameter family; boundary clipping and arrow shortening remain Core responsibilities.',
);

/** 校验关系端点、Flow 局部坐标中的路由及可选标签预留区域 */
export const FlowRelationArtifactSchema = strictObject({
  source: FlowEndpointTargetSchema.describe('Authored source Flow element identity.'),
  target: FlowEndpointTargetSchema.describe('Authored target Flow element identity.'),
  route: FlowRouteArtifactSchema.describe('Final relation route in Flow-local coordinates.'),
  labelReservation: LayoutArtifactRectSchema.optional().describe('Optional reserved label rectangle.'),
}).describe('Final renderer-neutral geometry for one authored Flow Relation.');

/** 校验统一局部坐标中的 Flow 几何结果及布局来源 */
export const FlowDiagramArtifactSchema = strictObject({
  layout: strictObject({
    definition: NonBlankStringSchema.describe('Flow Layout Definition that produced this geometry.'),
  }).describe('Layout provenance for this compile result.'),
  frame: FlowArtifactBoundsSchema.describe('Final Diagram frame geometry.'),
  regions: strictObject({
    title: FlowArtifactBoundsSchema.optional().describe('Title region when authored.'),
    description: FlowArtifactBoundsSchema.optional().describe('Description region when authored.'),
    drawing: FlowArtifactBoundsSchema.extend({
      origin: PositionSchema.describe(
        'Flow root origin in allocation-local coordinates; subtract from artifact controls for explicit authoring.',
      ),
    }).describe('Required Flow drawing region.'),
    legend: FlowArtifactBoundsSchema.optional().describe('Legend region when authored.'),
  }).describe('Only the Diagram regions present in this compile result.'),
  elements: array(FlowElementArtifactSchema).nonempty().describe('Recursive authored Flow element geometry.'),
  relations: array(FlowRelationArtifactSchema).describe('Authored root relations in Source order.'),
}).describe('Renderer-neutral Flow Diagram artifact in one Flow-local coordinate system.');
