import { z } from 'zod';

import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { PaintSchema } from '../paint';
import { StrokeStyleSchema } from '../stroke';
import { CssColorSchema, OpacitySchema } from './primitives';

export const PaintValueSchema = z
  .union([CssColorSchema, PaintSchema])
  .describe('Paint value: a CSS color string or a IRPaint object.');

export const GraphicPaintSchema = z
  .strictObject({
    color: CssColorSchema.optional().describe(
      'Master color for primary geometry. Stroke, fill, labels, and arrows may inherit it unless individually overridden.',
    ),
    fill: PaintValueSchema.optional().describe('Fill paint for primary geometry: CSS color string or IRPaint.'),
    stroke: PaintValueSchema.optional().describe('Stroke paint for primary geometry: CSS color string or IRPaint.'),
  })
  .describe('Graphic paint fields shared by primary geometry.');

export const GraphicOpacitySchema = z
  .strictObject({
    opacity: OpacitySchema.optional().describe('Whole-element opacity applied to primary geometry.'),
    fillOpacity: OpacitySchema.optional().describe('Fill-only opacity for filled regions.'),
    strokeOpacity: OpacitySchema.optional().describe('Stroke-only opacity for outlines.'),
  })
  .describe('Graphic opacity fields shared by primary geometry.');

export const GraphicEffectsSchema = z
  .strictObject({
    shadow: z
      .union([z.enum(ShadowPreset), DropShadowSchema])
      .optional()
      .describe(
        'Drop shadow on the emitted primary geometry. A preset keyword (`sm`/`md`/`lg`/`xl`/`2xl`/`none`) or an explicit drop-shadow object.',
      ),
    blendMode: z
      .enum(BlendMode)
      .optional()
      .describe(
        'How the emitted primary geometry blends with content already drawn beneath it. Omitted / `normal` means ordinary source-over.',
      ),
  })
  .describe('Graphic effect fields shared by primary geometry.');

export const GraphicStyleSchema = z
  .strictObject({
    ...GraphicPaintSchema.shape,
    fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
    strokeWidth: StrokeStyleSchema.shape.strokeWidth,
    strokeOpacity: GraphicOpacitySchema.shape.strokeOpacity,
    opacity: GraphicOpacitySchema.shape.opacity,
    ...GraphicEffectsSchema.shape,
  })
  .describe('Graphic style fields for primary node / drawable geometry.');

export const CascadingGraphicStyleSchema = z
  .strictObject({
    ...GraphicPaintSchema.shape,
    fillOpacity: GraphicOpacitySchema.shape.fillOpacity,
    strokeWidth: StrokeStyleSchema.shape.strokeWidth,
    strokeOpacity: GraphicOpacitySchema.shape.strokeOpacity,
    opacity: GraphicOpacitySchema.shape.opacity,
  })
  .describe('Cascading graphic style fields shared by node and path-like elements.');
