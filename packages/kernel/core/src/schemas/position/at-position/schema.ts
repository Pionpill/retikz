import { z } from 'zod';

import { AtDirection } from './constants';

export const AtPositionSchema = z
  .object({
    direction: z
      .enum(AtDirection)
      .describe('Canonical direction from the referenced node toward this node, in visual convention.'),
    of: z
      .string()
      .min(1)
      .describe('Referenced node or coordinate id; must already be defined.'),
    distance: z
      .number()
      .positive()
      .optional()
      .describe(
        'Distance from the referenced node center to this node center in user units. Falls back to the compile-time nodeDistance, then to 1.',
      ),
  })
  .describe('Relative position: place this node at `direction` from `of`, separated by `distance`.');
