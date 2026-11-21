import { NonBlankStringSchema, JsonObjectSchema } from '@retikz/foundation';
import { strictObject, array, number } from 'zod';

import { AnimationTrackSchema } from './animation';

/** 校验可绘制元素的标识、元数据、动画与同级堆叠次序 */
export const DrawableInstanceSchema = strictObject({
  id: NonBlankStringSchema.optional().describe('Stable reference ID for the emitted primitive.'),
  meta: JsonObjectSchema.optional().describe('Copied unchanged to Scene primitives without affecting compilation.'),
  animations: array(AnimationTrackSchema)
    .optional()
    .describe('Passed to emitted primitives without affecting layout or bounds. Not inherited across scopes.'),
  zIndex: number()
    .int()
    .optional()
    .describe('Sibling stacking order. Higher draws on top; ties keep source order. Defaults to 0.'),
});
