import { z } from 'zod';

/**
 * 渐变 stop：位置 + 颜色 + 可选透明度
 * @description offset 0..1（沿渐变轴的位置）；color 任意 CSS 颜色（含 `currentColor` 主题反应）；opacity 0..1。
 */
export const GradientStopSchema = z
  .object({
    offset: z.number().min(0).max(1).describe('Stop position along the gradient axis, 0..1'),
    color: z.string().describe('Any CSS color (e.g. "#08f", "navy", "currentColor")'),
    opacity: z.number().min(0).max(1).optional().describe('Stop opacity 0..1; omitted = fully opaque'),
  })
  .describe('A single gradient color stop');

/**
 * Paint server 规格（渐变）；纯色仍是 `fill` / `stroke` 上的 string，不进此 schema
 * @description alpha.7 只做 linear / radial gradient；pattern / image 顺延（ADR-04）。纯 JSON 形态，保 IR 可序列化。
 *   linear 方向用 `angle`（度，polar 约定：0°=+x，90°=+y 屏幕下）；radial 的 `center` / `radius` 用 objectBoundingBox（0..1，随形状缩放）。
 */
export const PaintSpecSchema = z
  .discriminatedUnion('type', [
    z
      .object({
        type: z.literal('linearGradient'),
        stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
        angle: z
          .number()
          .finite()
          .optional()
          .describe('Gradient direction in degrees (polar convention; 0°=+x, 90°=+y screen-down); omitted = renderer default (left→right)'),
      })
      .describe('Linear gradient paint server'),
    z
      .object({
        type: z.literal('radialGradient'),
        stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
        center: z
          .tuple([z.number().finite(), z.number().finite()])
          .optional()
          .describe('Center in objectBoundingBox units (0..1 relative to the filled shape); omitted = (0.5, 0.5)'),
        radius: z
          .number()
          .finite()
          .positive()
          .optional()
          .describe('Radius in objectBoundingBox units (0..1); omitted = 0.5'),
      })
      .describe('Radial gradient paint server'),
  ])
  .describe('Paint server spec (gradient). Solid color stays a plain string on `fill` / `stroke`; pattern / image deferred.');

/** 渐变 stop 类型 */
export type IRGradientStop = z.infer<typeof GradientStopSchema>;
/** Paint server 规格类型（渐变） */
export type IRPaintSpec = z.infer<typeof PaintSpecSchema>;
