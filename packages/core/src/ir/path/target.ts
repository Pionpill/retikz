import { z } from 'zod';
import { RECT_ANCHORS, type RectAnchor } from '../../geometry/rect';
import { OffsetPositionSchema, PolarPositionSchema, PositionSchema } from '../position';

/** 9 个命名 anchor（复用 geometry/rect.ts，避免两套常量） */
const NAMED_ANCHORS = Object.values(RECT_ANCHORS) as [RectAnchor, ...Array<RectAnchor>];

export const AnchorRefSchema = z
  .union([
    z.enum(NAMED_ANCHORS).describe('Named anchor (center / north / ... / south-west)'),
    z.number().finite().describe('Angle anchor in degrees (boundary point in that direction)'),
    z
      .object({
        side: z
          .enum(['north', 'south', 'east', 'west'])
          .describe('Which edge of the shape boundary'),
        t: z
          .number()
          .min(0)
          .max(1)
          .describe('Proportion along the edge (0..1); direction north/south = west→east, east/west = north→south'),
      })
      .describe('Proportional point on the real shape boundary edge'),
  ])
  .describe('Anchor reference: named anchor, angle in degrees, or proportional point { side, t } on the boundary');

export const NodeTargetSchema = z
  .object({
    id: z.string().min(1).describe('Referenced Node/Coordinate id'),
    anchor: AnchorRefSchema.optional().describe('Optional anchor; omitted = auto clip to boundary'),
    offset: z
      .tuple([z.number().finite(), z.number().finite()])
      .optional()
      .describe('Optional world-space 2D offset added after the anchor/edge point is resolved'),
  })
  .describe('Reference to a Node/Coordinate by id, with optional anchor and world-space offset');

/** anchor 引用：命名 anchor / 角度 / 边上比例点 */
export type IRAnchorRef = z.infer<typeof AnchorRefSchema>;

/** 节点 / Coordinate 引用对象：{ id, anchor?, offset? } */
export type IRNodeTarget = z.infer<typeof NodeTargetSchema>;

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
    NodeTargetSchema,
    z.string().min(1),
    RelativeTargetSchema,
    RelativeAccumulateTargetSchema,
    OffsetPositionSchema,
  ])
  .describe(
    'Path endpoint: Cartesian [x, y], polar position, node target object ({ id, anchor?, offset? }), node id string (React DSL shorthand), relative offset object ({ relative } / { relativeAccumulate }), or offset position ({ of, offset } mirroring TikZ `calc`) resolved at compile time',
  );

/** 路径端点：直接坐标 [x, y]、极坐标、节点 id 字符串、相对偏移对象 */
export type IRTarget = z.infer<typeof TargetSchema>;

/** 相对前一 step 终点的偏移；不更新 prevEnd（TikZ `(+x, +y)`） */
export type IRRelativeTarget = z.infer<typeof RelativeTargetSchema>;

/** 累积相对偏移；更新 prevEnd（TikZ `(++x, ++y)`） */
export type IRRelativeAccumulateTarget = z.infer<typeof RelativeAccumulateTargetSchema>;
