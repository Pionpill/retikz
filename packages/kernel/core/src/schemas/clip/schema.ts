import { z } from 'zod';

/**
 * 裁剪区规格（4 种结构化形状之一）
 * @description renderer-agnostic 的纯数值裁剪区：`rect` 取景窗 / `circle` 圆形遮罩 / `ellipse` 椭圆遮罩 /
 *   `polygon` 任意直边区域。坐标为所在 scope 的局部坐标系（与 scope children 同帧）。
 *   尺寸字段 `.positive()`、坐标 `` 守 Scene JSON 可序列化（NaN/Infinity round-trip 失真）。
 *   不含 SVG path 迷你语言（任意贝塞尔裁剪推迟）。
 */
export const ClipSpecSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        kind: z.literal('rect'),
        x: z.number().describe('Rect left-top x in scope-local coords'),
        y: z.number().describe('Rect left-top y in scope-local coords'),
        width: z.number().positive().describe('Rect width in user units.'),
        height: z.number().positive().describe('Rect height in user units.'),
      })
      .describe('Rectangular clip region'),
    z
      .object({
        kind: z.literal('circle'),
        cx: z.number().describe('Circle center x'),
        cy: z.number().describe('Circle center y'),
        r: z.number().positive().describe('Circle radius in user units.'),
      })
      .describe('Circular clip region'),
    z
      .object({
        kind: z.literal('ellipse'),
        cx: z.number().describe('Ellipse center x'),
        cy: z.number().describe('Ellipse center y'),
        rx: z.number().positive().describe('Ellipse x radius in user units.'),
        ry: z.number().positive().describe('Ellipse y radius in user units.'),
      })
      .describe('Elliptical clip region'),
    z
      .object({
        kind: z.literal('polygon'),
        points: z
          .array(z.tuple([z.number(), z.number()]))
          .min(3)
          .describe('Polygon vertices as [x, y] tuples.'),
      })
      .describe('Polygon clip region (arbitrary straight-edge area)'),
  ])
  .describe(
    'Clip region for `Scope.clip`: rect, circle, ellipse, or polygon in scope-local coordinates.',
  );
