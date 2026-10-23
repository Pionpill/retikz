import { NormalizedFractionSchema } from '@retikz/foundation';
import type { ZodType } from 'zod';
import { lazy, union, object, tuple } from 'zod';

import { OffsetPositionSchema } from './offset';
import type { IROffsetPosition } from './offset';
import { PolarPositionSchema } from './polar';
import type { PolarPosition } from './polar';
import { PositionSchema } from './position';
import type { IRPosition } from './position';
import { NodeTargetSchema } from './target';
import type { IRNodeTarget } from './target';

/** 递归校验不依赖路径相对游标的绝对目标 */
export const AbsoluteTargetSchema: ZodType<IRAbsoluteTarget> = lazy(() =>
  union([PositionSchema, PolarPositionSchema, NodeTargetSchema, OffsetPositionSchema, BetweenPositionSchema]),
);

/** 校验编译时从两端点按归一化比例求得的位置 */
export const BetweenPositionSchema = object({
  between: tuple([AbsoluteTargetSchema, AbsoluteTargetSchema]).describe(
    'Two endpoints (AbsoluteTarget each; path-relative excluded)',
  ),
  fraction: NormalizedFractionSchema.describe('Proportion from the first endpoint to the second endpoint.'),
}).describe(
  'Proportional point between two endpoints, resolved at compile time. Allowed in node, coordinate, and path endpoint positions.',
);

/** 不依赖上一段路径游标的目标位置，支持坐标、引用和嵌套定位 */
export type IRAbsoluteTarget = IRPosition | PolarPosition | IRNodeTarget | IROffsetPosition | IRBetweenPosition;

/** 按比例选取两个目标之间的位置 */
export type IRBetweenPosition = {
  /** 依次指定插值起点与终点，可使用命名位置或嵌套插值 */
  between: [IRAbsoluteTarget, IRAbsoluteTarget];
  /** 起点到终点的插值比例，0 为起点、1 为终点 */
  fraction: number;
};
