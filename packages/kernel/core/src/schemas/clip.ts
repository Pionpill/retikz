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
        width: z.number().positive().describe('Rect width (> 0)'),
        height: z.number().positive().describe('Rect height (> 0)'),
      })
      .describe('Rectangular clip region'),
    z
      .object({
        kind: z.literal('circle'),
        cx: z.number().describe('Circle center x'),
        cy: z.number().describe('Circle center y'),
        r: z.number().positive().describe('Circle radius (> 0)'),
      })
      .describe('Circular clip region'),
    z
      .object({
        kind: z.literal('ellipse'),
        cx: z.number().describe('Ellipse center x'),
        cy: z.number().describe('Ellipse center y'),
        rx: z.number().positive().describe('Ellipse x radius (> 0)'),
        ry: z.number().positive().describe('Ellipse y radius (> 0)'),
      })
      .describe('Elliptical clip region'),
    z
      .object({
        kind: z.literal('polygon'),
        points: z
          .array(z.tuple([z.number(), z.number()]))
          .min(3)
          .describe('Polygon vertices [x, y][]; at least 3 points, each finite'),
      })
      .describe('Polygon clip region (arbitrary straight-edge area)'),
  ])
  .describe(
    'Clip region: one of rect / circle / ellipse / polygon, in scope-local coordinates. Used by `Scope.clip`; compiled into a renderer-agnostic ClipResource and referenced via the group `clipRef`.',
  );

/** 裁剪区 IR 类型（4 形状判别 union） */
export type IRClipSpec = z.infer<typeof ClipSpecSchema>;
