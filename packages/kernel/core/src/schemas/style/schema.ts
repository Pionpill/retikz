import { NormalizedFractionSchema } from '@retikz/foundation';
import { enum as zodEnum, strictObject, union } from 'zod';

import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { PaintSchema } from '../paint';
import { StrokeStyleSchema } from '../stroke';
import { CssColorSchema, OpacitySchema } from './primitives';

export const ContextualColorSchema = union([CssColorSchema, NormalizedFractionSchema]).describe(
  'Contextual color: an exact CSS color string or a normalized weight derived from the effective master color.',
);

export const PaintValueSchema = union([ContextualColorSchema, PaintSchema]).describe(
  'Paint value: a contextual color or an IRPaint object.',
);

export const GraphicPaintSchema = strictObject({
  color: CssColorSchema.optional().describe(
    'Master color for primary geometry. Stroke, fill, labels, and arrows may inherit it unless individually overridden.',
  ),
  fill: PaintValueSchema.optional().describe('Fill paint for primary geometry: contextual color or IRPaint.'),
  stroke: PaintValueSchema.optional().describe('Stroke paint for primary geometry: contextual color or IRPaint.'),
}).describe('Graphic paint fields shared by primary geometry.');

export const GraphicOpacitySchema = strictObject({
  opacity: OpacitySchema.optional().describe('Whole-element opacity applied to primary geometry.'),
  fillOpacity: OpacitySchema.optional().describe('Fill-only opacity for filled regions.'),
  strokeOpacity: OpacitySchema.optional().describe('Stroke-only opacity for outlines.'),
}).describe('Graphic opacity fields shared by primary geometry.');

export const GraphicEffectsSchema = strictObject({
  shadow: union([zodEnum(ShadowPreset), DropShadowSchema])
    .optional()
    .describe(
      'Drop shadow on the emitted primary geometry. A preset keyword (`sm`/`md`/`lg`/`xl`/`2xl`/`none`) or an explicit drop-shadow object.',
    ),
  blendMode: zodEnum(BlendMode)
    .optional()
    .describe(
      'How the emitted primary geometry blends with content already drawn beneath it. Omitted / `normal` means ordinary source-over.',
    ),
}).describe('Graphic effect fields shared by primary geometry.');

export const GraphicStyleSchema = strictObject({
  ...GraphicPaintSchema.shape,
  fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
  strokeWidth: StrokeStyleSchema.shape.strokeWidth,
  strokeOpacity: GraphicOpacitySchema.shape.strokeOpacity,
  opacity: GraphicOpacitySchema.shape.opacity,
  ...GraphicEffectsSchema.shape,
}).describe('Graphic style fields for primary node / drawable geometry.');

export const CascadingGraphicStyleSchema = strictObject({
  ...GraphicPaintSchema.shape,
  fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
  strokeWidth: StrokeStyleSchema.shape.strokeWidth,
  strokeOpacity: GraphicOpacitySchema.shape.strokeOpacity,
  opacity: GraphicOpacitySchema.shape.opacity,
}).describe('Cascading graphic style fields shared by node and path-like elements.');
