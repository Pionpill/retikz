import { z } from 'zod';

import { CssColorSchema, OpacitySchema } from '../../style';
import { BuiltinArrowShape } from './constants';

export const ArrowEndDetailSchema = z
  .object({
    shape: z
      .union([z.enum(BuiltinArrowShape), z.string().min(1)])
      .optional()
      .describe('Arrow shape provider name. Built-ins and registered custom names are accepted.'),
    scale: z
      .number()
      .positive()
      .optional()
      .describe('Uniform arrow-tip scale applied to both `length` and `width`. Defaults to 1.'),
    length: z
      .number()
      .nonnegative()
      .optional()
      .describe('Arrow-tip length along the path direction, in user units. Defaults to the shape definition fallback.'),
    width: z
      .number()
      .nonnegative()
      .optional()
      .describe('Arrow-tip width perpendicular to the path, in user units. Defaults to the shape definition fallback.'),
    color: CssColorSchema.optional().describe(
      'Arrow color override. Hollow arrows use it as stroke; solid arrows use it as the fallback fill/stroke color. Omitted arrows inherit the path stroke.',
    ),
    fill: CssColorSchema.optional().describe(
      'Fill override for solid arrow shapes. Hollow arrow definitions ignore fill and use `color` for their outline.',
    ),
    opacity: OpacitySchema.optional().describe('Arrow-only opacity. When omitted, the arrow follows the path opacity.'),
    lineWidth: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Outline width for hollow arrow definitions, in user units. Solid arrow definitions ignore this field.',
      ),
  })
  .describe('Per-end arrow visual spec. Missing fields inherit from arrowDetail and definition defaults.');

export const ArrowDetailSchema = ArrowEndDetailSchema.extend({
  start: ArrowEndDetailSchema.optional().describe(
    'Per-start arrow override. Present fields override top-level arrowDetail defaults.',
  ),
  end: ArrowEndDetailSchema.optional().describe(
    'Per-end arrow override. Present fields override top-level arrowDetail defaults.',
  ),
}).describe(
  'Path-level arrow detail. Top-level fields are shared defaults for both ends; `start` / `end` override them per field.',
);
