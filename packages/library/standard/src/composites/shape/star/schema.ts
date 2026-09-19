import { PositionSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, union, number } from 'zod';

import { ShapePathSchema, ShapeVertexAngleSchema, ShapeInnerRatioSchema } from '../shared';
const properties = {
  ...ShapePathSchema.shape,
  namespace: literal('standard'),
  type: literal('star'),
  center: PositionSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
  points: number().int().min(2).describe('Number of outer star vertices; at least two.'),
  outerRadius: NonNegativeNumberSchema.describe('Circumradius of outer star vertices.'),
  rotate: ShapeVertexAngleSchema,
};
/** Star 的持久化几何契约 */
export const StarSchema = union([
  strictObject({
    ...properties,
    innerRadius: NonNegativeNumberSchema.describe('Inner radius; cannot exceed the outer radius.'),
  }).superRefine((input, ctx) => {
    if (input.innerRadius > input.outerRadius)
      ctx.addIssue({ code: 'custom', path: ['innerRadius'], message: 'Inner radius cannot exceed outer radius.' });
  }),
  strictObject({ ...properties, innerRatio: ShapeInnerRatioSchema }),
]);
