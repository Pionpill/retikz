import { PositionSchema, TargetSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, union } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
import {
  ShapeAnglesSchema,
  ShapeBoxAdjustmentSchema,
  ShapeBoxSchema,
  ShapeClosedSchema,
  ShapeFitSchema,
  ShapePathSchema,
  refineShapeAngles,
  refineShapeBox,
} from '../shared';

const properties = {
  ...ShapePathSchema.shape,
  namespace: literal(STANDARD_NAMESPACE),
  type: literal('circle'),
  ...ShapeAnglesSchema.shape,
  closed: ShapeClosedSchema.unwrap().optional(),
};
const fitProperties = { ...ShapeBoxAdjustmentSchema.shape, fit: ShapeFitSchema };
/** 持久化圆形 composite 的互斥几何输入 */
export const CircleSchema = union([
  strictObject({
    ...properties,
    center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    radius: NonNegativeNumberSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
  }),
  strictObject({
    ...properties,
    center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    diameter: NonNegativeNumberSchema.describe('Circle diameter in user units.'),
  }),
  strictObject({
    ...properties,
    from: PositionSchema.describe('First endpoint of the circle diameter.'),
    to: PositionSchema.describe('Second endpoint of the circle diameter.'),
  }),
  strictObject({
    ...properties,
    ...fitProperties,
    corner1: PositionSchema.describe('First corner of the authored bounding rectangle.'),
    corner2: PositionSchema.describe('Opposite corner of the authored bounding rectangle.'),
  }).superRefine(refineShapeBox),
  strictObject({ ...properties, ...fitProperties, box: ShapeBoxSchema }).superRefine(refineShapeBox),
])
  .superRefine((input, ctx) => refineShapeAngles(input, ctx))
  .describe('Semantic circle with one geometry description; lowered to a Core Stroke Path.');
