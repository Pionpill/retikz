import { z } from 'zod';

import type { SharedPolarPosition } from '../../../shared';

import { AngleDegreesSchema } from '../../scalar';
import { PositionSchema } from '../position';

export const PolarPositionSchema: z.ZodType<SharedPolarPosition> = z.lazy(() =>
  z
    .object({
      origin: z
        .union([z.string().min(1), PositionSchema, PolarPositionSchema])
        .optional()
        .describe(
          'Origin reference: node id string, Cartesian [x, y], or nested PolarPosition. Omitted fields use [0, 0].',
        ),
      angle: AngleDegreesSchema.describe(
        'Angle in degrees measured from the positive x axis. Positive angles follow the screen y-down convention.',
      ),
      radius: z.number().describe('Radius or distance in user units.'),
    })
    .describe('Polar coordinate position; resolved to Cartesian at Scene compile time'),
);
