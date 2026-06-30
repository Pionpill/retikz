import { z } from 'zod';

/**
 * 渐变 stop：位置 + 颜色 + 可选透明度
 * @description offset 0..1（沿渐变轴的位置）；color 任意 CSS 颜色（含 `currentColor` 主题反应）；opacity 0..1。
 */
export const GradientStopSchema = z
  .object({
    offset: z.number().min(0).max(1).describe('Stop position along the gradient axis.'),
    color: z.string().describe('CSS color for this stop.'),
    opacity: z.number().min(0).max(1).optional().describe('Stop opacity. Omitted fields are fully opaque.'),
  })
  .describe('A single gradient color stop');

/**
 * Paint server 规格（渐变 / 图案 / 图片）；纯色仍是 `fill` / `stroke` 上的 string，不进此 schema
 * @description 四种 paint server：linear / radial gradient、pattern（图案）、image（图片）。纯 JSON 形态，保 IR 可序列化。
 *   linear 方向用 `angle`（度，polar 约定：0°=+x，90°=+y 屏幕下）；radial 的 `center` / `radius` 用 objectBoundingBox（0..1，随形状缩放）。
 */
export const PaintSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('linearGradient'),
        stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
        angle: z
          .number()
          .optional()
          .describe('Gradient direction angle in degrees. Omitted fields use the paint backend default.'),
      })
      .describe('Linear gradient paint server'),
    z
      .object({
        kind: z.literal('radialGradient'),
        stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
        center: z
          .tuple([z.number(), z.number()])
          .optional()
          .describe('Center in object-bounding-box coordinates. Omitted fields use [0.5, 0.5].'),
        radius: z
          .number()
          .positive()
          .optional()
          .describe('Radius in object-bounding-box units. Omitted fields use 0.5.'),
      })
      .describe('Radial gradient paint server'),
    z
      .object({
        kind: z.literal('conicGradient'),
        stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
        center: z
          .tuple([z.number(), z.number()])
          .optional()
          .describe('Center in object-bounding-box coordinates. Omitted fields use [0.5, 0.5].'),
        angle: z
          .number()
          .optional()
          .describe('Start angle in degrees. Omitted fields use 0.'),
      })
      .describe('Conic gradient paint server'),
    z
      .object({
        kind: z.literal('pattern'),
        shape: z
          .string()
          .min(1)
          .describe(
            'Pattern motif provider name. Built-ins are `lines`, `dots`, and `grid`; custom names must be registered via CompileOptions.patterns.',
          ),
        color: z.string().optional().describe('Motif color; any CSS color, defaults to `currentColor`'),
        background: z.string().optional().describe('Tile background fill; omitted = transparent'),
        size: z
          .number()
          .positive()
          .optional()
          .describe('Tile period in user units (line gap / dot spacing); default 8'),
        lineWidth: z
          .number()
          .positive()
          .optional()
          .describe('Line / grid stroke width; for dots, drives the dot radius. Default 1 (dots default to size/5)'),
        rotation: z
          .number()
          .optional()
          .describe('Rotate the whole pattern, in degrees'),
      })
      .describe('Pattern paint server (hatching / dots / grid)'),
    z
      .object({
        kind: z.literal('image'),
        href: z.string().min(1).describe('Image URL (http(s) or data URI)'),
        fit: z
          .enum(['fill', 'contain', 'cover'])
          .optional()
          .describe('How the image maps to the shape: `fill` (stretch) / `contain` / `cover`. Default `cover`'),
      })
      .describe('Image paint server (fills the shape with an image)'),
  ])
  .describe('Paint server spec: gradient / pattern / image. Solid color stays a plain string on `fill` / `stroke`.');
