import { z } from 'zod';

import { BoundarySchema } from '../../boundary';
import { BetweenPositionSchema } from '../../position/between-position/schema';
import { OffsetPositionSchema } from '../../position/offset-position/schema';
import { PolarPositionSchema } from '../../position/polar-position/schema';
import { PositionSchema } from '../../position/position/schema';

export const AnchorRefSchema = z
  .union([
    z
      .string()
      .min(1)
      .describe(
        'Named anchor: compass anchor, web alias, or shape-specific anchor. Unknown names fail at compile time.',
      ),
    z.number().describe('Angle anchor in degrees (boundary point in that direction)'),
    z
      .object({
        side: z.enum(['north', 'south', 'east', 'west']).describe('Which edge of the shape boundary'),
        t: z
          .number()
          .min(0)
          .max(1)
          .describe('Proportion along the edge; north/south run west to east, east/west run north to south.'),
      })
      .describe('Proportional point on the real shape boundary edge'),
  ])
  .describe('Anchor reference: named anchor, angle in degrees, or proportional point { side, t } on the boundary');

export const NodeTargetSchema = z
  .object({
    id: z.string().min(1).describe('Referenced Node/Coordinate id'),
    anchor: AnchorRefSchema.optional().describe('Optional anchor; omitted = auto clip to boundary'),
    offset: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Optional world-space 2D offset added after the anchor/edge point is resolved'),
    boundary: BoundarySchema.optional().describe(
      'Per-endpoint override of the target node connection surface. Used for auto-clipped endpoints and compass or angle anchors.',
    ),
  })
  .describe('Reference to a Node/Coordinate by id, with optional anchor and world-space offset');

export const RelativeTargetSchema = z
  .object({
    relative: z.tuple([z.number(), z.number()]).describe('Relative offset (dx, dy)'),
  })
  .describe('Relative offset from the previous step end point. Does not update the cursor position.');

export const RelativeAccumulateTargetSchema = z
  .object({
    relativeAccumulate: z.tuple([z.number(), z.number()]).describe('Accumulated relative offset (dx, dy)'),
  })
  .describe('Accumulated relative offset from the previous step end point. Updates the cursor position.');

export const TargetSchema = z
  .union([
    PositionSchema,
    PolarPositionSchema,
    NodeTargetSchema,
    RelativeTargetSchema,
    RelativeAccumulateTargetSchema,
    OffsetPositionSchema,
    // between 经 z.lazy 引用，化解 target.ts ↔ between-position.ts 的模块环（between 端点又引 NodeTarget）
    z.lazy(() => BetweenPositionSchema),
  ])
  .describe(
    'Path endpoint: Cartesian [x, y], polar position, node target, relative offset, accumulated relative offset, offset position, or between position. Non-Cartesian forms resolve at compile time.',
  );
