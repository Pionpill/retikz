import { z } from 'zod';
import { OffsetPositionSchema, PolarPositionSchema, PositionSchema } from '../position';

export const RelativeTargetSchema = z
  .object({
    relative: z
      .tuple([z.number(), z.number()])
      .describe('Relative offset (dx, dy)'),
  })
  .describe(
    'Relative offset from the previous step end point (does NOT update the cursor position; matches TikZ `(+x, +y)` syntax)',
  );

export const RelativeAccumulateTargetSchema = z
  .object({
    relativeAccumulate: z
      .tuple([z.number(), z.number()])
      .describe('Accumulated relative offset (dx, dy)'),
  })
  .describe(
    'Accumulated relative offset from the previous step end point (DOES update the cursor; matches TikZ `(++x, ++y)` syntax)',
  );

export const TargetSchema = z
  .union([
    PositionSchema,
    PolarPositionSchema,
    z.string().min(1),
    RelativeTargetSchema,
    RelativeAccumulateTargetSchema,
    OffsetPositionSchema,
  ])
  .describe(
    'Path endpoint: Cartesian [x, y], polar position, node id reference, relative offset object ({ relative } / { relativeAccumulate }), or offset position ({ of, offset } mirroring TikZ `calc`) resolved at compile time',
  );

/** 路径端点：直接坐标 [x, y]、极坐标、节点 id 字符串、相对偏移对象 */
export type IRTarget = z.infer<typeof TargetSchema>;

/** 相对前一 step 终点的偏移；不更新 prevEnd（TikZ `(+x, +y)`） */
export type IRRelativeTarget = z.infer<typeof RelativeTargetSchema>;

/** 累积相对偏移；更新 prevEnd（TikZ `(++x, ++y)`） */
export type IRRelativeAccumulateTarget = z.infer<typeof RelativeAccumulateTargetSchema>;
