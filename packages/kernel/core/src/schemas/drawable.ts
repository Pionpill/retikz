import { z } from 'zod';
import { AnimationTrackSchema } from './animation';
import { BlendMode, DropShadowSchema, ShadowPreset } from './effects';
import { JsonObjectSchema } from './json';
import { PaintSpecSchema } from './paint';

export const DrawableStyleSchema = z
  .object({
    color: z
      .string()
      .optional()
      .describe(
        'Master color (TikZ `color=`) for path-like drawable geometry. Path stroke, ribbon fill, attached labels, and arrow tips may use it as their default color unless individually overridden.',
      ),
    fill: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Fill paint for drawable geometry: any CSS color string or a PaintSpec (linear / radial gradient, pattern, or image). Path uses it for closed regions; ribbon uses it for the ribbon polygon.',
      ),
    fillOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Fill opacity 0..1; affects only filled areas.'),
    stroke: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Stroke paint for drawable geometry: any CSS color string or a PaintSpec (linear / radial gradient, pattern, or image). Path uses it for the main stroke; ribbon uses it for the optional outline.',
      ),
    strokeWidth: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe('Stroke width in user units.'),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Stroke opacity 0..1 (TikZ `draw opacity`); affects only stroked outlines.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Whole drawable opacity 0..1; applies to the emitted primary geometry.'),
    shadow: z
      .union([z.enum(ShadowPreset), DropShadowSchema])
      .optional()
      .describe(
        'Drop shadow on the emitted primary drawable geometry. A preset keyword (`sm`/`md`/`lg`/`xl`/`2xl`/`none`) or an explicit drop-shadow object.',
      ),
    blendMode: z
      .enum(BlendMode)
      .optional()
      .describe(
        'How the emitted primary drawable geometry blends with content already drawn beneath it. Omitted / `normal` means ordinary source-over.',
      ),
  })
  .strict()
  .describe('Shared geometry style fields for path-like drawable elements.');

export const DrawableMetaSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional stable id used as a reference target and hydration hook for the Scene primitive(s) emitted by this drawable element.',
      ),
    meta: JsonObjectSchema.optional().describe(
      'Opaque provenance metadata carried by this drawable element. Preserved verbatim into emitted Scene primitive(s), ignored by renderers, and never interpreted by the compiler. Must be a JSON object. Not inherited across scopes.',
    ),
    animations: z
      .array(AnimationTrackSchema)
      .optional()
      .describe(
        'Declarative timeline animation tracks carried verbatim into the emitted Scene primitive(s). They do not affect layout or bounding boxes and are not inherited across scopes.',
      ),
    zIndex: z
      .number()
      .int()
      .finite()
      .optional()
      .describe(
        'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable within the same parent group.',
      ),
  })
  .strict()
  .describe('Shared identity, provenance, animation, and stacking metadata for drawable elements.');

export type IRDrawableStyle = z.infer<typeof DrawableStyleSchema>;
export type IRDrawableMeta = z.infer<typeof DrawableMetaSchema>;
export type IRDrawableSharedStyle = IRDrawableStyle & Pick<IRDrawableMeta, 'zIndex'>;
