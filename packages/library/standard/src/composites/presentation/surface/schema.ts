import {
  BoxSpacingSchema,
  ChildSchema,
  CompositeBaseSchema,
  GraphicOpacitySchema,
  PaintValueSchema,
  ScopePropsSchema,
} from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutOverflow, LayoutOverflowSchema } from '@retikz/layout/compose';
import { literal, strictObject, union } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
import { StandardPathStrokeStyleSchema } from '../shared/schemas';
import { SURFACE_TYPE } from './constants';

export const SurfaceBackgroundSchema = strictObject({
  fill: PaintValueSchema.describe('Fill paint covering the complete Surface allocation box.'),
  fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
}).describe('Optional fill appearance for the Surface allocation box.');

export const SurfaceBorderSchema = StandardPathStrokeStyleSchema.omit({ zIndex: true }).describe(
  'Optional stroke appearance drawn on the Surface allocation boundary.',
);

const SurfacePaddingSchema = union([NonNegativeNumberSchema, BoxSpacingSchema]).describe(
  'Uniform or side-specific non-negative Surface padding.',
);

export const SurfaceSchema = CompositeBaseSchema.extend({
  namespace: literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: literal(SURFACE_TYPE).describe('Composite type for a single arbitrary-child presentation surface.'),
  ...ScopePropsSchema.shape,
  child: ChildSchema.describe('The one JSON-safe Core or Tier 2 child wrapped by this Surface.'),
  padding: SurfacePaddingSchema.default(0),
  overflow: LayoutOverflowSchema.default(LayoutOverflow.Visible).describe(
    'Whether child visual overflow remains visible or is clipped.',
  ),
  background: SurfaceBackgroundSchema.optional(),
  border: SurfaceBorderSchema.optional(),
  cornerRadius: NonNegativeNumberSchema.default(0).describe('Shared non-negative boundary radius in user units.'),
});
