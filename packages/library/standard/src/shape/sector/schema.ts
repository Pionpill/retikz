import { PositionSchema, TargetSchema, StepLabelSchema } from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { literal, strictObject, union } from 'zod';

import { ShapePathSchema, ShapeAnglesSchema, refineShapeAngles, ShapeRadiusAxesSchema } from '../shared';

const properties = {
  ...ShapePathSchema.shape,
  namespace: literal('standard'),
  type: literal('sector'),
  ...ShapeAnglesSchema.shape,
  label: StepLabelSchema.optional(),
};
/** Sector 的持久化几何契约 */
export const SectorSchema = union([
  strictObject({
    ...properties,
    center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    radius: NonNegativeNumberSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
    innerRadius: literal(0).optional(),
  }),
  strictObject({
    ...properties,
    center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    radius: ShapeRadiusAxesSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
    innerRadius: strictObject({ x: literal(0), y: literal(0) }).optional(),
  }),
  strictObject({
    ...properties,
    center: PositionSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    radius: NonNegativeNumberSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
    innerRadius: NonNegativeNumberSchema.optional().describe('Inner radius; cannot exceed the outer radius.'),
  }).superRefine((input, ctx) => {
    if (input.innerRadius !== undefined && input.innerRadius > input.radius)
      ctx.addIssue({ code: 'custom', path: ['innerRadius'], message: 'Inner radius cannot exceed outer radius.' });
  }),
  strictObject({
    ...properties,
    center: PositionSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
    radius: ShapeRadiusAxesSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
    innerRadius: ShapeRadiusAxesSchema.optional().describe('Inner radius; cannot exceed the outer radius.'),
  }).superRefine((input, ctx) => {
    if (input.innerRadius === undefined) return;
    if ((input.innerRadius.x === 0) !== (input.innerRadius.y === 0))
      ctx.addIssue({
        code: 'custom',
        path: ['innerRadius'],
        message: 'Inner axes must both be zero or both positive.',
      });
    if (input.innerRadius.x > input.radius.x || input.innerRadius.y > input.radius.y)
      ctx.addIssue({ code: 'custom', path: ['innerRadius'], message: 'Inner radii cannot exceed outer radii.' });
  }),
]).superRefine((input, ctx) => refineShapeAngles(input, ctx, true));
