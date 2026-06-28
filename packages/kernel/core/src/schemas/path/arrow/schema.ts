import { z } from 'zod';

import { BuiltinArrowShape } from './constants';

/**
 * 端点级箭头视觉规格 schema
 * @description 顶层 8 字段全 optional；fill 在空心 shape 上 silent no-op（schema 不拒绝、compile/render 丢字段）；start/end 子对象用相同字段集（无 start/end 递归）
 */
export const ArrowEndDetailSchema = z
  .object({
    shape: z
      .union([z.enum(BuiltinArrowShape), z.string().min(1)])
      .optional()
      .describe(
        'Arrow shape provider name. Built-ins: normal, open, stealth, openStealth, diamond, openDiamond, circle, openCircle. Custom names must be registered via CompileOptions.arrows.',
      ),
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
    color: z
      .string()
      .optional()
      .describe(
        'Arrow color override. Hollow arrows use it as stroke; solid arrows use it as the fallback fill/stroke color. Omitted arrows inherit the path stroke.',
      ),
    fill: z
      .string()
      .optional()
      .describe(
        'Fill override for solid arrow shapes. Hollow arrow definitions ignore fill and use `color` for their outline.',
      ),
    opacity: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe('Arrow-only opacity. When omitted, the arrow follows the path opacity.'),
    lineWidth: z
      .number()

      .nonnegative()
      .optional()
      .describe(
        'Outline width for hollow arrow definitions, in user units. Solid arrow definitions ignore this field.',
      ),
  })
  .describe(
    'Per-end arrow visual spec. Omitted fields inherit from top-level `arrowDetail`, then from the arrow definition defaults.',
  );

/**
 * Path 级箭头详细配置 schema
 * @description 顶层视觉字段（与 `ArrowEndDetailSchema` 同字段集）作为起末共享默认；`start` / `end` 子对象逐字段 merge 顶层（缺省字段继承，已填字段 override）
 */
export const ArrowDetailSchema = ArrowEndDetailSchema.extend({
  start: ArrowEndDetailSchema.optional().describe(
    'Start-end override (effective only when `arrow` includes a start arrow: `<-` / `<->`). Fields merge into the top-level defaults; omitted fields inherit, present fields override.',
  ),
  end: ArrowEndDetailSchema.optional().describe(
    'End-end override (effective only when `arrow` includes an end arrow: `->` / `<->`). Fields merge into the top-level defaults; omitted fields inherit, present fields override.',
  ),
}).describe(
  'Path-level arrow detail. Top-level fields are shared defaults for both ends; `start` / `end` override them per field.',
);
