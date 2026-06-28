import { z } from 'zod';
import { AtDirection } from './constants';

export const AtPositionSchema = z
  .object({
    direction: z
      .enum(AtDirection)
      .describe(
        'Direction from the referenced node toward this node, in visual convention (above = visually upward, screen y-).',
      ),
    of: z
      .string()
      .min(1)
      .describe(
        'Id of the referenced node or coordinate; must be defined earlier in the IR (forward references rejected, mirroring polar `origin` and string targets).',
      ),
    distance: z
      .number()
      .positive()
      .optional()
      .describe(
        'Distance from the referenced node center to this node center in user units. Falls back to the compile-time nodeDistance, then to 1.',
      ),
  })
  .describe(
    'Relative position: place this node at `direction` from `of`, separated by `distance`.',
  );
