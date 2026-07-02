import { z } from 'zod';

import { normalizeAnchor, normalizeSide, WebSide } from '../../../shared';
import { BoundarySchema } from '../../boundary';
import { AngleDegreesSchema, NormalizedFractionSchema } from '../../scalar';

export const BoundaryAnchorRefSchema = z
  .object({
    side: z
      .preprocess(value => (typeof value === 'string' ? normalizeSide(value) ?? value : value), z.enum(WebSide))
      .describe('Which edge of the shape boundary. Compass and TikZ side names are accepted aliases.'),
    fraction: NormalizedFractionSchema.describe(
      'Proportion along the edge; top/bottom run left to right, right/left run top to bottom.',
    ),
  })
  .describe('Proportional point on the real shape boundary edge');

export const AnchorRefSchema = z
  .union([
    z
      .string()
      .min(1)
      .transform(name => normalizeAnchor(name) ?? name)
      .describe(
        'Named anchor: web anchor, compass/TikZ alias, or shape-specific anchor. Known aliases are normalized to web names; unknown names fail at compile time.',
      ),
    AngleDegreesSchema.describe('Angle anchor in degrees (boundary point in that direction)'),
    BoundaryAnchorRefSchema,
  ])
  .describe('Anchor reference: named anchor, angle in degrees, or proportional point { side, fraction } on the boundary');

export const NodeTargetSchema = z
  .object({
    id: z.string().min(1).describe('Referenced Node/Coordinate id'),
    anchor: AnchorRefSchema.optional().describe('Optional anchor; omitted = auto clip to boundary'),
    offset: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Optional world-space 2D offset added after the anchor/edge point is resolved'),
    boundary: BoundarySchema.optional().describe(
      'Per-endpoint override of the target node connection surface. Used for auto-clipped endpoints and standard direction or angle anchors.',
    ),
  })
  .describe('Reference to a Node/Coordinate by id, with optional anchor and world-space offset');
