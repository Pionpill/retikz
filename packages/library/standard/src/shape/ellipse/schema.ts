import { PositionSchema, TargetSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, union } from 'zod';

import {
  ShapePathSchema,
  ShapeAnglesSchema,
  ShapeClosedSchema,
  ShapeBoxAdjustmentSchema,
  ShapeBoxSchema,
  refineShapeBox,
  refineShapeAngles,
  ShapeRadiusAxesSchema,
} from '../shared';

const properties = {
  ...ShapePathSchema.shape,
  namespace: literal('standard'),
  type: literal('ellipse'),
  ...ShapeAnglesSchema.shape,
  closed: ShapeClosedSchema.unwrap().optional(),
};
/** Ellipse 的持久化几何契约 */
export const EllipseSchema = union([
  strictObject({
    ...properties,
    center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    radius: ShapeRadiusAxesSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
  }),
  strictObject({
    ...properties,
    center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    diameterX: NonNegativeNumberSchema.describe('Horizontal ellipse diameter.'),
    diameterY: NonNegativeNumberSchema.describe('Vertical ellipse diameter.'),
  }),
  strictObject({
    ...properties,
    ...ShapeBoxAdjustmentSchema.shape,
    corner1: PositionSchema.describe('First corner of the authored bounding rectangle.'),
    corner2: PositionSchema.describe('Opposite corner of the authored bounding rectangle.'),
  }).superRefine(refineShapeBox),
  strictObject({ ...properties, ...ShapeBoxAdjustmentSchema.shape, box: ShapeBoxSchema }).superRefine(refineShapeBox),
]).superRefine((input, ctx) => refineShapeAngles(input, ctx));
