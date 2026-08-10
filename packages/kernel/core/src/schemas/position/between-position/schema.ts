import { NormalizedFractionSchema } from '@retikz/foundation';
import { z } from 'zod';

import type { IRAbsoluteTarget, IRBetweenPosition } from './types';

import { NodeTargetSchema } from '../node-target';
import { OffsetPositionSchema } from '../offset-position';
import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';

export const AbsoluteTargetSchema: z.ZodType<IRAbsoluteTarget> = z.lazy(() =>
  z.union([PositionSchema, PolarPositionSchema, NodeTargetSchema, OffsetPositionSchema, BetweenPositionSchema]),
);

export const BetweenPositionSchema: z.ZodType<IRBetweenPosition> = z.lazy(() =>
  z
    .object({
      between: z
        .tuple([AbsoluteTargetSchema, AbsoluteTargetSchema])
        .describe('Two endpoints (AbsoluteTarget each; path-relative excluded)'),
      fraction: NormalizedFractionSchema.describe('Proportion from the first endpoint to the second endpoint.'),
    })
    .describe(
      'Proportional point between two endpoints, resolved at compile time. Allowed in node, coordinate, and path endpoint positions.',
    ),
);
