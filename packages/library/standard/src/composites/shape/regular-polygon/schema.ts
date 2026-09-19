import { PositionSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, union, number } from 'zod';

import { ShapePathSchema, ShapeVertexAngleSchema } from '../shared';
const properties = {
  ...ShapePathSchema.shape,
  namespace: literal('standard'),
  type: literal('regularPolygon'),
  center: PositionSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
  sides: number().int().min(3).describe('Number of polygon sides; at least three.'),
  rotate: ShapeVertexAngleSchema,
};
/** RegularPolygon 的持久化几何契约 */
export const RegularPolygonSchema = union([
  strictObject({
    ...properties,
    radius: NonNegativeNumberSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
  }),
  strictObject({ ...properties, sideLength: NonNegativeNumberSchema.describe('Regular polygon side length.') }),
]);
