import { z } from 'zod';
import type { ValueOf } from '../types';

/**
 * 内置 pattern motif 名常量（用 const + ValueOf 派生，不用 TS enum）
 * @description 内置 3 motif：`lines`（横向阴影线）/ `dots`（波点）/ `grid`（横竖网格）。
 *   各 motif 的 tile 几何由 `BUILTIN_PATTERNS` 的 `PatternDefinition.emit` 在 compile 期产出。
 */
export const PatternShape = {
  Lines: 'lines',
  Dots: 'dots',
  Grid: 'grid',
} as const;

/**
 * 内置 3 pattern motif 名联合
 * @description `BUILTIN_PATTERNS` 的 Record key（保穷尽性约束，不随 `PatternShapeName` 开放而退化为 `string`）
 */
export type PatternShapeValue = ValueOf<typeof PatternShape>;
export type BuiltinPatternName = PatternShapeValue;

/**
 * pattern motif 名：开放字符串
 * @description 内置 `BuiltinPatternName`，或经 `CompileOptions.patterns` 注册的扩展 motif 名；
 *   `& {}` 让 IDE 仍对内置 3 名自动补全，同时接受任意非空字符串
 */
export type PatternShapeName = BuiltinPatternName | (string & {});

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
 * Paint server 规格（渐变 / 图案 / 图片）；纯色仍是 `fill` / `stroke` 上的 string，不进此 schema
 * @description 四种 paint server：linear / radial gradient、pattern（图案）、image（图片）。纯 JSON 形态，保 IR 可序列化。
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
    z
      .object({
        type: z.literal('pattern'),
        shape: z
          .string()
          .min(1)
          .describe(
            'Registered pattern motif name; built-in `lines` (hatching) / `dots` / `grid` (crosshatch), or an extension motif registered via `CompileOptions.patterns`. Any non-empty string passes schema validation; unregistered names are rejected at compile time.',
          ),
        color: z.string().optional().describe('Motif color; any CSS color, defaults to `currentColor`'),
        background: z.string().optional().describe('Tile background fill; omitted = transparent'),
        size: z
          .number()
          .finite()
          .positive()
          .optional()
          .describe('Tile period in user units (line gap / dot spacing); default 8'),
        lineWidth: z
          .number()
          .finite()
          .positive()
          .optional()
          .describe('Line / grid stroke width; for dots, drives the dot radius. Default 1 (dots default to size/5)'),
        rotation: z
          .number()
          .finite()
          .optional()
          .describe('Rotate the whole pattern, in degrees'),
      })
      .describe('Pattern paint server (hatching / dots / grid)'),
    z
      .object({
        type: z.literal('image'),
        href: z.string().min(1).describe('Image URL (http(s) or data URI)'),
        fit: z
          .enum(['fill', 'contain', 'cover'])
          .optional()
          .describe('How the image maps to the shape: `fill` (stretch) / `contain` / `cover`. Default `cover`'),
      })
      .describe('Image paint server (fills the shape with an image)'),
  ])
  .describe('Paint server spec: gradient / pattern / image. Solid color stays a plain string on `fill` / `stroke`.');

/** 渐变 stop 类型 */
export type IRGradientStop = z.infer<typeof GradientStopSchema>;
/** Paint server 规格类型（渐变 / 图案 / 图片） */
export type IRPaintSpec = z.infer<typeof PaintSpecSchema>;
