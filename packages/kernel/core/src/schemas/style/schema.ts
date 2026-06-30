import { z } from 'zod';

import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { PaintSpecSchema } from '../paint';
import { CssColorSchema, OpacitySchema } from './primitives';

export const PaintValueSchema = z
  .union([CssColorSchema, PaintSpecSchema])
  .describe('Paint value: a CSS color string or a PaintSpec object.');

export const GraphicStyleSchema = z
  .object({
    color: CssColorSchema.optional().describe(
      'Master color for primary geometry. Stroke, fill, labels, and arrows may inherit it unless individually overridden.',
    ),
    fill: PaintValueSchema.optional().describe('Fill paint for primary geometry: CSS color string or PaintSpec.'),
    fillOpacity: OpacitySchema.optional().describe('Fill-only opacity for filled regions.'),
    stroke: PaintValueSchema.optional().describe('Stroke paint for primary geometry: CSS color string or PaintSpec.'),
    strokeWidth: z.number().nonnegative().optional().describe('Stroke width in user units.'),
    drawOpacity: OpacitySchema.optional().describe('Stroke-only opacity for outlines.'),
    opacity: OpacitySchema.optional().describe('Whole-element opacity applied to primary geometry.'),
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
  .strict()
  .describe('Graphic style fields for primary node / drawable geometry.');

export const CascadingGraphicStyleSchema = z
  .object({
    color: CssColorSchema.optional().describe(
      'Cascading master color for elements. Stroke, fill, text, labels, and arrows may inherit it unless overridden.',
    ),
    fill: PaintValueSchema.optional().describe('Cascading default fill paint: CSS color string or PaintSpec.'),
    fillOpacity: OpacitySchema.optional().describe('Cascading fill-only opacity for filled regions.'),
    stroke: PaintValueSchema.optional().describe('Cascading default stroke paint: CSS color string or PaintSpec.'),
    strokeWidth: z.number().nonnegative().optional().describe('Cascading default stroke width in user units.'),
    drawOpacity: OpacitySchema.optional().describe('Cascading stroke-only opacity for outlines.'),
    opacity: OpacitySchema.optional().describe('Cascading whole-element opacity.'),
  })
  .strict()
  .describe('Cascading graphic style fields shared by node and path-like elements.');
