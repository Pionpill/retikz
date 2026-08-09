import { PathBaseSchema, PositionSchema } from '@retikz/core';
import { z } from 'zod';

import {
  ConnectorAppearanceSchema,
  ConnectorBendDirectionSchema,
  ConnectorRouteKind,
  ConnectorRouteKindSchema,
  LogicCompositeType,
  LogicDiagramPointSchema,
  LogicGeometryLabelSchema,
  NonBlankStringSchema,
  NOTATION_NAMESPACE,
} from '../shared';

const StraightRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Straight),
  })
  .describe('Straight segment between Connector endpoints.');

const PolylineRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Polyline),
    points: z.array(LogicDiagramPointSchema).min(1).describe('One or more explicit intermediate waypoints.'),
  })
  .describe('Explicit polyline routing between Connector endpoints.');

const TwoLegOrthogonalRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Orthogonal),
    pattern: z.enum(['hv', 'vh']).describe('Two-leg orthogonal direction.'),
  })
  .describe('Two-leg orthogonal routing.');

const ThreeLegOrthogonalRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Orthogonal),
    pattern: z.enum(['hvh', 'vhv']).describe('Three-leg orthogonal direction.'),
    ratio: z.number().min(0).max(1).default(0.5).describe('Normalized middle-leg position.'),
  })
  .describe('Three-leg orthogonal routing with normalized middle-leg position.');

const QuadraticRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Quadratic),
    control: PositionSchema.describe('Quadratic Bezier control point.'),
  })
  .describe('Quadratic Bezier routing.');

const CubicRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Cubic),
    control1: PositionSchema.describe('Cubic Bezier start control point.'),
    control2: PositionSchema.describe('Cubic Bezier end control point.'),
  })
  .describe('Cubic Bezier routing.');

const DirectionBendRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Bend),
    direction: ConnectorBendDirectionSchema.optional(),
    angle: z.number().gt(-180).lt(180).optional(),
    looseness: z.number().positive().optional(),
  })
  .describe('Core bend routing selected by direction, angle, and looseness.');

const TangentBendRoutingSchema = z
  .strictObject({
    kind: z.literal(ConnectorRouteKind.Bend),
    tangents: z
      .strictObject({
        outAngle: z.number().describe('Outgoing tangent angle.'),
        inAngle: z.number().describe('Incoming tangent angle.'),
      })
      .describe('Explicit outgoing and incoming bend tangents.'),
    looseness: z.number().positive().optional(),
  })
  .describe('Core bend routing selected by explicit tangents.');

/** Connector routing union */
export const ConnectorRoutingSchema = z
  .union([
    StraightRoutingSchema,
    PolylineRoutingSchema,
    TwoLegOrthogonalRoutingSchema,
    ThreeLegOrthogonalRoutingSchema,
    QuadraticRoutingSchema,
    CubicRoutingSchema,
    DirectionBendRoutingSchema,
    TangentBendRoutingSchema,
  ])
  .describe('Closed Connector route union lowered to Core Path steps.');

const ConnectorAppearanceCanonicalSchema = ConnectorAppearanceSchema.extend({
  stroke: PathBaseSchema.shape.stroke.default('currentColor'),
  strokeWidth: PathBaseSchema.shape.strokeWidth.default(1),
  roundedCorners: PathBaseSchema.shape.roundedCorners.default(0),
  marks: PathBaseSchema.shape.marks.default([{ pos: 1, mark: { kind: 'arrow' } }]),
  zIndex: PathBaseSchema.shape.zIndex.default(0),
});

const ConnectorShape = {
  namespace: z.literal(NOTATION_NAMESPACE).describe('Notation composite namespace.'),
  type: z.literal(LogicCompositeType.Connector).describe('Connector composite discriminator.'),
  id: NonBlankStringSchema.describe('Stable authored Connector identity.'),
  role: NonBlankStringSchema.optional().describe('Open authored Connector role.'),
  from: LogicDiagramPointSchema.describe('Connector source point or authored target.'),
  to: LogicDiagramPointSchema.describe('Connector destination point or authored target.'),
  routing: ConnectorRoutingSchema.default({ kind: ConnectorRouteKind.Straight }).describe(
    'Canonical route variant and parameters.',
  ),
  label: LogicGeometryLabelSchema.optional().describe('Core step label input.'),
  appearance: ConnectorAppearanceCanonicalSchema.default({
    stroke: 'currentColor',
    strokeWidth: 1,
    roundedCorners: 0,
    marks: [{ pos: 1, mark: { kind: 'arrow' } }],
    zIndex: 0,
  }).describe('Core Path appearance allowlist.'),
} as const;

type ConnectorValue = z.infer<z.ZodObject<typeof ConnectorShape>>;

/** 校验 Connector 的 route 交叉字段约束 */
const refineConnector = (value: ConnectorValue, context: z.RefinementCtx): void => {
  if (value.routing.kind !== ConnectorRouteKind.Polyline) return;

  const first = value.routing.points[0];
  const last = value.routing.points[value.routing.points.length - 1];
  if (JSON.stringify(first) === JSON.stringify(value.from)) {
    context.addIssue({
      code: 'custom',
      path: ['routing', 'points', 0],
      message: 'Polyline points must not repeat the Connector from endpoint.',
    });
  }
  if (JSON.stringify(last) === JSON.stringify(value.to)) {
    context.addIssue({
      code: 'custom',
      path: ['routing', 'points', value.routing.points.length - 1],
      message: 'Polyline points must not repeat the Connector to endpoint.',
    });
  }
};

/** Connector canonical JSON-safe schema */
export const ConnectorSchema = z
  .strictObject(ConnectorShape)
  .superRefine(refineConnector)
  .describe('Canonical JSON-safe Notation Connector composite.');

/** Expose canonical appearance schema for downstream leader consumers */
export { ConnectorAppearanceCanonicalSchema };
export { ConnectorRouteKindSchema };
