import { NormalizedFractionSchema } from '@retikz/foundation';
import { z } from 'zod';

import { Side } from '../../../shared';
import { BoundarySchema } from '../../boundary';
import { AngleDegreesSchema } from '../../scalar';

export const BoundaryAnchorRefSchema = z
  .object({
    side: z.enum(Side).describe('Canonical edge of the shape boundary.'),
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
      .describe('Named anchor: canonical anchor or shape-specific anchor. Unknown names fail at compile time.'),
    AngleDegreesSchema.describe('Angle anchor in degrees (boundary point in that direction)'),
    BoundaryAnchorRefSchema,
  ])
  .describe(
    'Anchor reference: named anchor, angle in degrees, or proportional point { side, fraction } on the boundary',
  );

export const NodeTargetSchema = z
  .object({
    id: z.string().min(1).describe('Referenced Node, Coordinate, or resolved Scope id.'),
    anchor: AnchorRefSchema.optional().describe(
      'Optional target anchor. The meaning of omission is defined by the consuming position or path context.',
    ),
    offset: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Optional world-space 2D offset added after the anchor/edge point is resolved'),
    boundary: BoundarySchema.optional().describe(
      'Per-endpoint override of the target node connection surface. Used for auto-clipped endpoints and standard direction or angle anchors.',
    ),
  })
  .describe('Reference to a Node, Coordinate, or resolved Scope by id, with optional anchor and world-space offset');
