import { createOpenStringSchema, NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { CssColorSchema, OpacitySchema } from '../../style';
import { BuiltinArrowShape } from './constants';

/** Core 内置 arrow 与自定义注册名共享的开放名称 schema */
export const ArrowShapeSchema = createOpenStringSchema(BuiltinArrowShape).describe(
  'Arrow shape provider name: a Core built-in or a custom name registered via CompileOptions.arrows.',
);

export const ArrowEndDetailSchema = strictObject({
  shape: ArrowShapeSchema.optional().describe(
    'Arrow shape provider name. Built-ins and registered custom names are accepted.',
  ),
  scale: PositiveNumberSchema.optional().describe(
    'Uniform arrow-tip scale applied to both `length` and `width`. Defaults to 1.',
  ),
  length: NonNegativeNumberSchema.optional().describe(
    'Arrow-tip length along the path direction, in user units. Defaults to the shape definition value, or 8.',
  ),
  width: NonNegativeNumberSchema.optional().describe(
    'Arrow-tip width perpendicular to the path, in user units. Defaults to the shape definition value, or 8.',
  ),
  color: CssColorSchema.optional().describe(
    'Arrow color override. Hollow arrows use it as stroke; solid arrows use it as the fallback fill/stroke color. Omitted arrows inherit the path stroke.',
  ),
  fill: CssColorSchema.optional().describe(
    'Fill override for solid arrow shapes. Hollow arrow definitions ignore fill and use `color` for their outline.',
  ),
  opacity: OpacitySchema.optional().describe('Arrow-only opacity. When omitted, the arrow follows the path opacity.'),
  lineWidth: NonNegativeNumberSchema.optional().describe(
    'Outline width for hollow arrow definitions, in user units. Solid arrow definitions ignore this field.',
  ),
}).describe('Per-end arrow visual spec. Missing fields inherit from arrowDetail and definition defaults.');

export const ArrowDetailSchema = ArrowEndDetailSchema.extend({
  start: ArrowEndDetailSchema.optional().describe(
    'Per-start arrow override. Present fields override top-level arrowDetail defaults.',
  ),
  end: ArrowEndDetailSchema.optional().describe(
    'Per-end arrow override. Present fields override top-level arrowDetail defaults.',
  ),
})
  .strict()
  .describe(
    'Path-level arrow detail. Top-level fields are shared defaults for both ends; `start` / `end` override them per field.',
  );
