import { z } from 'zod';

const PointSchema = z.tuple([z.number(), z.number()]);

export const MovePathCommandSchema = z.object({
  kind: z.literal('move'),
  to: PointSchema.describe('Move target point.'),
});

export const LinePathCommandSchema = z.object({
  kind: z.literal('line'),
  to: PointSchema.describe('Line target point.'),
});

export const QuadPathCommandSchema = z.object({
  kind: z.literal('quad'),
  control: PointSchema.describe('Quadratic Bezier control point.'),
  to: PointSchema.describe('Quadratic Bezier target point.'),
});

export const CubicPathCommandSchema = z.object({
  kind: z.literal('cubic'),
  control1: PointSchema.describe('First cubic Bezier control point.'),
  control2: PointSchema.describe('Second cubic Bezier control point.'),
  to: PointSchema.describe('Cubic Bezier target point.'),
});

export const ArcPathCommandSchema = z.object({
  kind: z.literal('arc'),
  center: PointSchema.describe('Arc center point.'),
  radius: z.number().positive().describe('Arc radius in user units.'),
  startAngle: z.number().describe('Arc start angle in degrees.'),
  endAngle: z.number().describe('Arc end angle in degrees.'),
  counterClockwise: z.boolean().optional().describe('Whether to draw counter-clockwise.'),
});

export const EllipseArcPathCommandSchema = z.object({
  kind: z.literal('ellipseArc'),
  center: PointSchema.describe('Ellipse arc center point.'),
  radiusX: z.number().positive().describe('Ellipse arc x radius in user units.'),
  radiusY: z.number().positive().describe('Ellipse arc y radius in user units.'),
  rotation: z.number().optional().describe('Ellipse rotation in degrees.'),
  startAngle: z.number().describe('Ellipse arc start angle in degrees.'),
  endAngle: z.number().describe('Ellipse arc end angle in degrees.'),
  counterClockwise: z.boolean().optional().describe('Whether to draw counter-clockwise.'),
});

export const ClosePathCommandSchema = z.object({
  kind: z.literal('close'),
});

export const PathCommandSchema = z
  .discriminatedUnion('kind', [
    MovePathCommandSchema,
    LinePathCommandSchema,
    QuadPathCommandSchema,
    CubicPathCommandSchema,
    ArcPathCommandSchema,
    EllipseArcPathCommandSchema,
    ClosePathCommandSchema,
  ])
  .describe('Structured path command used by Scene paths and path-like clip resources.');
