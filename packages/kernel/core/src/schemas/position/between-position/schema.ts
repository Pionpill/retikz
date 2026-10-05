import { NormalizedFractionSchema } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { lazy, object, tuple, union } from 'zod';

import { NodeTargetSchema } from '../node-target';
import { OffsetPositionSchema } from '../offset-position';
import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';
import type { IRAbsoluteTarget, IRBetweenPosition } from './types';

/** 递归校验不依赖路径相对游标的绝对目标 */
export const AbsoluteTargetSchema: ZodType<IRAbsoluteTarget> = lazy(() =>
  union([PositionSchema, PolarPositionSchema, NodeTargetSchema, OffsetPositionSchema, BetweenPositionSchema]),
);

/** 校验编译时从两端点按归一化比例求得的位置 */
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
