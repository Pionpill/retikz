import { PositiveNumberSchema } from '@retikz/foundation';
import { boolean, discriminatedUnion, literal, number, strictObject, tuple } from 'zod';

import { AngleDegreesSchema } from '../scalar';

const PointSchema = tuple([number(), number()]);

export const MovePathCommandSchema = strictObject({
  kind: literal('move').describe('Discriminator for move path commands.'),
  to: PointSchema.describe('Move target point.'),
});

export const LinePathCommandSchema = strictObject({
  kind: literal('line').describe('Discriminator for line path commands.'),
  to: PointSchema.describe('Line target point.'),
});

export const QuadPathCommandSchema = strictObject({
  kind: literal('quad').describe('Discriminator for quadratic Bezier path commands.'),
  control: PointSchema.describe('Quadratic Bezier control point.'),
  to: PointSchema.describe('Quadratic Bezier target point.'),
});

export const CubicPathCommandSchema = strictObject({
  kind: literal('cubic').describe('Discriminator for cubic Bezier path commands.'),
  control1: PointSchema.describe('First cubic Bezier control point.'),
  control2: PointSchema.describe('Second cubic Bezier control point.'),
  to: PointSchema.describe('Cubic Bezier target point.'),
});

export const ArcPathCommandSchema = strictObject({
  kind: literal('arc').describe('Discriminator for circular arc path commands.'),
  center: PointSchema.describe('Arc center point.'),
  radius: PositiveNumberSchema.describe('Arc radius in user units.'),
  startAngle: AngleDegreesSchema.describe('Arc start angle in degrees.'),
  endAngle: AngleDegreesSchema.describe('Arc end angle in degrees.'),
  counterClockwise: boolean().optional().describe('Whether to draw counter-clockwise.'),
});

export const EllipseArcPathCommandSchema = strictObject({
  kind: literal('ellipseArc').describe('Discriminator for elliptical arc path commands.'),
  center: PointSchema.describe('Ellipse arc center point.'),
  radiusX: PositiveNumberSchema.describe('Ellipse arc x radius in user units.'),
  radiusY: PositiveNumberSchema.describe('Ellipse arc y radius in user units.'),
  rotation: AngleDegreesSchema.optional().describe('Ellipse rotation in degrees.'),
  startAngle: AngleDegreesSchema.describe('Ellipse arc start angle in degrees.'),
  endAngle: AngleDegreesSchema.describe('Ellipse arc end angle in degrees.'),
  counterClockwise: boolean().optional().describe('Whether to draw counter-clockwise.'),
});

export const ClosePathCommandSchema = strictObject({
  kind: literal('close').describe('Discriminator for close-path commands.'),
});

export const PathCommandSchema = discriminatedUnion('kind', [
  MovePathCommandSchema,
  LinePathCommandSchema,
  QuadPathCommandSchema,
  CubicPathCommandSchema,
  ArcPathCommandSchema,
  EllipseArcPathCommandSchema,
  ClosePathCommandSchema,
]).describe('Structured path command used by Scene paths and path-like clip resources.');
