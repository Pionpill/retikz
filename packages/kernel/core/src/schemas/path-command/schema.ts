import { z } from 'zod';

import { AngleDegreesSchema } from '../scalar';

const PointSchema = z.tuple([z.number(), z.number()]);

export const MovePathCommandSchema = z.strictObject({
  kind: z.literal('move').describe('Discriminator for move path commands.'),
  to: PointSchema.describe('Move target point.'),
});

export const LinePathCommandSchema = z.strictObject({
  kind: z.literal('line').describe('Discriminator for line path commands.'),
  to: PointSchema.describe('Line target point.'),
});

export const QuadPathCommandSchema = z.strictObject({
  kind: z.literal('quad').describe('Discriminator for quadratic Bezier path commands.'),
  control: PointSchema.describe('Quadratic Bezier control point.'),
  to: PointSchema.describe('Quadratic Bezier target point.'),
});

export const CubicPathCommandSchema = z.strictObject({
  kind: z.literal('cubic').describe('Discriminator for cubic Bezier path commands.'),
  control1: PointSchema.describe('First cubic Bezier control point.'),
  control2: PointSchema.describe('Second cubic Bezier control point.'),
  to: PointSchema.describe('Cubic Bezier target point.'),
});

export const ArcPathCommandSchema = z.strictObject({
  kind: z.literal('arc').describe('Discriminator for circular arc path commands.'),
  center: PointSchema.describe('Arc center point.'),
  radius: z.number().positive().describe('Arc radius in user units.'),
  startAngle: AngleDegreesSchema.describe('Arc start angle in degrees.'),
  endAngle: AngleDegreesSchema.describe('Arc end angle in degrees.'),
  counterClockwise: z.boolean().optional().describe('Whether to draw counter-clockwise.'),
});

export const EllipseArcPathCommandSchema = z.strictObject({
  kind: z.literal('ellipseArc').describe('Discriminator for elliptical arc path commands.'),
  center: PointSchema.describe('Ellipse arc center point.'),
  radiusX: z.number().positive().describe('Ellipse arc x radius in user units.'),
  radiusY: z.number().positive().describe('Ellipse arc y radius in user units.'),
  rotation: AngleDegreesSchema.optional().describe('Ellipse rotation in degrees.'),
  startAngle: AngleDegreesSchema.describe('Ellipse arc start angle in degrees.'),
  endAngle: AngleDegreesSchema.describe('Ellipse arc end angle in degrees.'),
  counterClockwise: z.boolean().optional().describe('Whether to draw counter-clockwise.'),
});

export const ClosePathCommandSchema = z.strictObject({
  kind: z.literal('close').describe('Discriminator for close-path commands.'),
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
