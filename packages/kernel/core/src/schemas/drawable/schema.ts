import { z } from 'zod';

import { AnimationTrackSchema } from '../animation';
import { JsonObjectSchema } from '../json';
import { GraphicStyleSchema } from '../style';

export const DrawableStyleSchema = GraphicStyleSchema.describe(
  'Shared geometry style fields for path-like drawable elements.',
);

export const DrawableInstanceSchema = z
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
  .describe('Shared instance-level identity, provenance, animation, and stacking fields for drawable elements.');
