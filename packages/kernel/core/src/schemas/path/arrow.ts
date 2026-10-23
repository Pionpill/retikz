import type { ValueOf, OpenString } from '@retikz/foundation';
import { createOpenStringSchema, PositiveNumberSchema, NonNegativeNumberSchema } from '@retikz/foundation';
import { strictObject } from 'zod';
import type { infer as ZodInfer } from 'zod';

import { GraphicStrokeSchema, ContextualColorSchema, PaintValueSchema, OpacitySchema } from '../style/graphic';

/** 内置箭头形状名称 */
export const BuiltinArrowShape = {
  Normal: 'normal',
  Open: 'open',
  Stealth: 'stealth',
  OpenStealth: 'openStealth',
  Circle: 'circle',
  OpenCircle: 'openCircle',
} as const;

export type BuiltinArrowShape = ValueOf<typeof BuiltinArrowShape>;

/** 箭头默认形状 */
export const DEFAULT_ARROW_SHAPE = BuiltinArrowShape.Stealth;

/** 箭头默认尺寸（length / width 的 fallback） */
export const ARROW_MARKER_DEFAULT_SIZE = 8;

/** 空心 shape 描边默认粗细（lineWidth fallback） */
export const ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH = 1.5;

/** Core 内置 arrow 与自定义注册名共享的开放名称 schema */
export const ArrowShapeSchema = createOpenStringSchema(BuiltinArrowShape).describe(
  'Arrow shape provider name: a Core built-in or a custom name registered via CompileOptions.arrows.',
);

/** 校验箭头的形状、尺寸与视觉样式 */
export const ArrowStyleSchema = strictObject({
  ...GraphicStrokeSchema.omit({ strokeWidth: true }).shape,
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
  fill: PaintValueSchema.optional().describe(
    'Fill override for solid arrow shapes. A number derives from the effective arrow color; hollow definitions ignore fill.',
  ),
  opacity: OpacitySchema.optional().describe('Arrow-only opacity. When omitted, the arrow follows the path opacity.'),
  lineWidth: NonNegativeNumberSchema.optional().describe(
    'Outline width for hollow arrow definitions, in user units. Solid arrow definitions ignore this field.',
  ),
}).describe('Arrow shape, dimensions, and visual style overrides.');

/** 校验两端箭头共用的视觉字段及逐端覆盖 */
export const ArrowDetailSchema = ArrowStyleSchema.extend({
  start: ArrowStyleSchema.optional().describe(
    'Per-start arrow override. Present fields override top-level arrowDetail defaults.',
  ),
  end: ArrowStyleSchema.optional().describe(
    'Per-end arrow override. Present fields override top-level arrowDetail defaults.',
  ),
})
  .strict()
  .describe(
    'Path-level arrow detail. Top-level fields are shared defaults for both ends; `start` / `end` override them per field.',
  );

/** 箭头形状、尺寸与视觉样式 */
export type IRArrowStyle = ZodInfer<typeof ArrowStyleSchema>;

/** Path 级箭头详细配置 */
export type IRArrowDetail = ZodInfer<typeof ArrowDetailSchema>;

/** 箭头形状名称，支持内置名称和已注册的自定义名称 */
export type ArrowShape = OpenString<BuiltinArrowShape>;
