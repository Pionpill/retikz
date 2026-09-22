import { PositionSchema, TargetSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, union } from 'zod';

import { ShapePathSchema } from '../shared';

const properties = {
  ...ShapePathSchema.shape,
  namespace: literal('standard'),
  type: literal('rectangle'),
  cornerRadius: NonNegativeNumberSchema.default(0).describe(
    'Corner radius; clamped to half the shorter rectangle side.',
  ),
};
/** Rectangle 的持久化几何契约 */
export const RectangleSchema = union([
  strictObject({
    ...properties,
    corner1: TargetSchema.describe('First corner of the authored bounding rectangle.'),
    corner2: TargetSchema.describe('Opposite corner of the authored bounding rectangle.'),
  }),
  strictObject({
    ...properties,
    center: PositionSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    width: NonNegativeNumberSchema.describe('Rectangle width in user units.'),
    height: NonNegativeNumberSchema.describe('Rectangle height in user units.'),
  }),
  strictObject({
    ...properties,
    center: PositionSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    side: NonNegativeNumberSchema.describe('Square side length.'),
  }),
  strictObject({
    ...properties,
    corner1: PositionSchema.describe('First corner of the authored bounding rectangle.'),
    width: NonNegativeNumberSchema.describe('Rectangle width in user units.'),
    height: NonNegativeNumberSchema.describe('Rectangle height in user units.'),
  }),
]);
