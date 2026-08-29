import { createOpenStringSchema, NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { ContextualColorSchema, OpacitySchema } from '../../style';
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
  color: ContextualColorSchema.optional().describe(
    'Arrow color override. A number derives from the effective path color; omitted arrows inherit the path stroke.',
  ),
  fill: ContextualColorSchema.optional().describe(
    'Fill override for solid arrow shapes. A number derives from the effective arrow color; hollow definitions ignore fill.',
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
