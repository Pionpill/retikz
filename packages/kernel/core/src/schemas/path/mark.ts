import {
  NonBlankStringSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
  NonNegativeNumberSchema,
  JsonObjectSchema,
} from '@retikz/foundation';
import type { ValueOf } from '@retikz/foundation';
import { strictObject, literal, union, number } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { GraphicStrokeSchema, ContextualColorSchema, PaintValueSchema, OpacitySchema } from '../style/graphic';

/** 内置普通标记形状名称 */
export const BuiltinMarkShape = {
  Times: 'times',
  Plus: 'plus',
  Check: 'check',
  Star: 'star',
} as const;

export type BuiltinMarkShape = ValueOf<typeof BuiltinMarkShape>;

/** 标记的形状、尺寸与视觉样式 */
export const MarkStyleSchema = strictObject({
  ...GraphicStrokeSchema.omit({ strokeWidth: true }).shape,
  shape: NonBlankStringSchema.optional().describe(
    'Mark shape provider name. Built-ins and registered custom names are accepted.',
  ),
  scale: PositiveNumberSchema.optional().describe(
    'Uniform mark scale applied to both `length` and `width`. Defaults to 1.',
  ),
  length: NonNegativeNumberSchema.optional().describe(
    'Mark length along the path direction, in user units. Defaults to the shape definition value, or 8.',
  ),
  width: NonNegativeNumberSchema.optional().describe(
    'Mark width perpendicular to the path, in user units. Defaults to the shape definition value, or 8.',
  ),
  color: ContextualColorSchema.optional().describe(
    'Mark master color when the path has no effective color. The effective path color overrides this field; explicit mark stroke and fill take precedence. Without either master color, marks inherit the path stroke.',
  ),
  fill: PaintValueSchema.optional().describe(
    'Fill override for solid mark shapes. A number derives from the effective mark color; hollow definitions ignore fill.',
  ),
  opacity: OpacitySchema.optional().describe('Mark-only opacity. When omitted, the mark follows the path opacity.'),
  lineWidth: NonNegativeNumberSchema.optional().describe(
    'Outline width for hollow mark definitions, in user units. Solid mark definitions ignore this field.',
  ),
  params: JsonObjectSchema.optional().describe('JSON parameters passed to the shape definition.'),
}).describe('Mark shape, dimensions, and visual style overrides.');

/** 沿路径放置的标记 */
export const PathMarkPlacementSchema = MarkStyleSchema.extend({
  pos: NormalizedFractionSchema.describe(
    'Normalized arc-length position along the path before arrow shortening and label interruption.',
  ),
  rotate: union([literal('auto'), number()])
    .optional()
    .describe('Tangent orientation by default, or a fixed angle in degrees.'),
});

export type IRMarkStyle = ZodInfer<typeof MarkStyleSchema>;
export type IRPathMark = ZodInfer<typeof PathMarkPlacementSchema>;
