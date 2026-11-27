import { NonBlankStringSchema, PositiveNumberSchema } from '@retikz/foundation';
import { object, enum as zodEnum } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { Anchor } from '../../shared';

/** 校验从引用对象沿指定方向与间距放置的位置 */
export const AtPositionSchema = object({
  direction: zodEnum(Anchor).describe('Direction from the reference toward the new position.'),
  of: NonBlankStringSchema.describe('Referenced node or coordinate id; must already be defined.'),
  distance: PositiveNumberSchema.optional().describe(
    'Center-to-center distance in user units; falls back to nodeDistance.',
  ),
}).describe('Place relative to an earlier reference.');

/** 相对定位 IR 类型 `{ direction, of, distance? }`，与 IRPosition/PolarPosition union 平级 */
export type IRAtPosition = ZodInfer<typeof AtPositionSchema>;
