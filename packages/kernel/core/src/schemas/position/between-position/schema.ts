import type { ZodType } from 'zod';

import { NormalizedFractionSchema } from '@retikz/foundation';
import { lazy, object, tuple, union } from 'zod';

import type { IRAbsoluteTarget, IRBetweenPosition } from './types';

import { NodeTargetSchema } from '../node-target';
import { OffsetPositionSchema } from '../offset-position';
import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';

export const AbsoluteTargetSchema: ZodType<IRAbsoluteTarget> = lazy(() =>
  union([PositionSchema, PolarPositionSchema, NodeTargetSchema, OffsetPositionSchema, BetweenPositionSchema]),
);

export const BetweenPositionSchema: ZodType<IRBetweenPosition> = lazy(() =>
  object({
    between: tuple([AbsoluteTargetSchema, AbsoluteTargetSchema]).describe(
      'Two endpoints (AbsoluteTarget each; path-relative excluded)',
    ),
    fraction: NormalizedFractionSchema.describe('Proportion from the first endpoint to the second endpoint.'),
  }).describe(
    'Proportional point between two endpoints, resolved at compile time. Allowed in node, coordinate, and path endpoint positions.',
  ),
);
