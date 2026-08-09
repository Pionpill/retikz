import { PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { Anchor } from '../../../shared';

export const AtPositionSchema = z
  .object({
    direction: z
      .enum(Anchor)
      .describe('Canonical direction from the referenced node toward this node, in visual convention.'),
    of: z.string().min(1).describe('Referenced node or coordinate id; must already be defined.'),
    distance: PositiveNumberSchema.optional().describe(
      'Distance from the referenced node center to this node center in user units. Falls back to the compile-time nodeDistance, then to 24.',
    ),
  })
  .describe('Relative position: place this node at `direction` from `of`, separated by `distance`.');
