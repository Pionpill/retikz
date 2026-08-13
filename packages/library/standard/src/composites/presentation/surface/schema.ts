import {
  BoxSpacingSchema,
  ChildSchema,
  CompositeBaseSchema,
  GraphicOpacitySchema,
  PaintValueSchema,
  resolveBoxSpacing,
  ScopePropsSchema,
} from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { LayoutOverflow, LayoutOverflowSchema } from '@retikz/layout/compose';
import { z } from 'zod';

import { STANDARD_NAMESPACE } from '../../shared';
import { StandardPathStrokeStyleSchema } from '../shared/schemas';
import { SURFACE_TYPE } from './constants';

export const SurfaceBackgroundSchema = z
  .strictObject({
    fill: PaintValueSchema.describe('Fill paint covering the complete Surface allocation box.'),
    fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
  })
  .describe('Optional fill appearance for the Surface allocation box.');

export const SurfaceBorderSchema = StandardPathStrokeStyleSchema.omit({ zIndex: true }).describe(
  'Optional stroke appearance drawn on the Surface allocation boundary.',
);

const SurfacePaddingInputSchema = z
  .union([NonNegativeNumberSchema, BoxSpacingSchema])
  .describe('Uniform or side-specific non-negative Surface padding.');

const SurfacePaddingSchema = z
  .strictObject({
    top: NonNegativeNumberSchema.describe('Canonical top padding in user units.'),
    right: NonNegativeNumberSchema.describe('Canonical right padding in user units.'),
    bottom: NonNegativeNumberSchema.describe('Canonical bottom padding in user units.'),
    left: NonNegativeNumberSchema.describe('Canonical left padding in user units.'),
  })
  .describe('Canonical four-sided Surface padding.');

export const SurfaceInputSchema = CompositeBaseSchema.extend({
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal(SURFACE_TYPE).describe('Composite type for a single arbitrary-child presentation surface.'),
  ...ScopePropsSchema.shape,
  child: ChildSchema.describe('The one JSON-safe Core or Tier 2 child wrapped by this Surface.'),
  padding: SurfacePaddingInputSchema.optional(),
  overflow: LayoutOverflowSchema.optional().describe('Whether child visual overflow remains visible or is clipped.'),
  background: SurfaceBackgroundSchema.optional(),
  border: SurfaceBorderSchema.optional(),
  cornerRadius: NonNegativeNumberSchema.optional().describe('Shared non-negative boundary radius in user units.'),
});

export const IRSurfaceSchema = CompositeBaseSchema.extend({
  namespace: z.literal(STANDARD_NAMESPACE).describe('Composite namespace for Standard drawing capabilities.'),
  type: z.literal(SURFACE_TYPE).describe('Composite type for a single arbitrary-child presentation surface.'),
  ...ScopePropsSchema.shape,
  child: ChildSchema.describe('The one JSON-safe Core or Tier 2 child wrapped by this Surface.'),
  padding: SurfacePaddingSchema,
  overflow: LayoutOverflowSchema.describe('Canonical child overflow policy.'),
  background: SurfaceBackgroundSchema.optional(),
  border: SurfaceBorderSchema.optional(),
  cornerRadius: NonNegativeNumberSchema.describe('Canonical shared boundary radius in user units.'),
});

export const SurfaceSchema = SurfaceInputSchema.extend({
  padding: SurfacePaddingInputSchema.optional()
    .transform(value => resolveBoxSpacing(value, 0))
    .pipe(SurfacePaddingSchema),
  overflow: LayoutOverflowSchema.default(LayoutOverflow.Visible),
  cornerRadius: NonNegativeNumberSchema.default(0),
});
