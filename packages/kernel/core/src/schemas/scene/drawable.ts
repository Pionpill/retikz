import { NonBlankStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { strictObject, array, number } from 'zod';

import { AnimationTrackSchema } from './animation';

/** 校验可绘制元素的标识、元数据、动画与同级堆叠次序 */
export const DrawableInstanceSchema = strictObject({
  id: NonBlankStringSchema.optional().describe(
    'Optional stable id used as a reference target for the Scene primitive emitted by this drawable element.',
  ),
  meta: JsonObjectSchema.optional().describe(
    'Opaque JSON metadata carried by this drawable element. Preserved into emitted Scene primitives and ignored by the compiler.',
  ),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe(
      'Declarative timeline animation tracks carried verbatim into the emitted Scene primitive(s). They do not affect layout or bounding boxes and are not inherited across scopes.',
    ),
  zIndex: number()
    .int()
    .optional()
    .describe(
      'Explicit stacking order among sibling IR children. Higher draws on top. Omitted = 0 = source order. Sorting is stable within the same parent group.',
    ),
}).describe('Shared instance-level identity, provenance, animation, and stacking fields for drawable elements.');
