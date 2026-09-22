import { TargetSchema, StepLabelSchema } from '@retikz/core';
import { literal, strictObject } from 'zod';

import {
  ShapePathSchema,
  ShapeAnglesSchema,
  refineShapeAngles,
  ShapeRadiusSchema,
  ShapeArcCloseSchema,
} from '../shared';
/** Arc 的持久化几何契约 */
export const ArcSchema = strictObject({
  ...ShapePathSchema.shape,
  namespace: literal('standard'),
  type: literal('arc'),
  center: TargetSchema.describe('Shape center; coordinate forms depend on the chosen geometry branch.'),
  radius: ShapeRadiusSchema.describe('Radius in user units; an object specifies the two ellipse axes.'),
  ...ShapeAnglesSchema.shape,
  close: ShapeArcCloseSchema,
  label: StepLabelSchema.optional(),
}).superRefine((input, ctx) => refineShapeAngles(input, ctx, true));
