import { z } from 'zod';
import { AnimationTrackSchema } from '../animation';
import { BlendMode, DropShadowSchema, ShadowPreset } from '../effects';
import { JsonObjectSchema } from '../json';
import { PaintSpecSchema } from '../paint';

export const DrawableStyleSchema = z
  .object({
    color: z
      .string()
      .optional()
      .describe(
        'Master color for path-like drawable geometry. Path stroke, ribbon fill, labels, and arrow tips may inherit it unless individually overridden.',
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
      .describe('Fill-only opacity for filled regions.'),
    stroke: z
      .union([z.string(), PaintSpecSchema])
      .optional()
      .describe(
        'Stroke paint for drawable geometry: any CSS color string or a PaintSpec (linear / radial gradient, pattern, or image). Path uses it for the main stroke; ribbon uses it for the optional outline.',
      ),
    strokeWidth: z
      .number()

      .nonnegative()
      .optional()
      .describe('Stroke width in user units.'),
    drawOpacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Stroke-only opacity for outlines.'),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Whole-drawable opacity applied to the emitted primary geometry.'),
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
        'Optional stable id used as a reference target for the Scene primitive emitted by this drawable element.',
      ),
    meta: JsonObjectSchema.optional().describe(
      'Opaque JSON metadata carried by this drawable element. Preserved into emitted Scene primitives and ignored by the compiler.',
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

      .optional()
      .describe(
        'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable within the same parent group.',
      ),
  })
  .strict()
  .describe('Shared identity, provenance, animation, and stacking metadata for drawable elements.');
