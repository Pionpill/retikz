import { z } from 'zod';
import { NodeTargetSchema } from '../../path/target';
import { OffsetPositionSchema } from '../offset-position';
import { PolarPositionSchema } from '../polar-position';
import { PositionSchema } from '../position';
import type { IRAbsoluteTarget, IRBetweenPosition } from './types';

/** AbsoluteTarget schema（z.lazy 自引用：between 可嵌套 between；NodeTarget 在 lazy thunk 内引用化解跨文件环） */
export const AbsoluteTargetSchema: z.ZodType<IRAbsoluteTarget> = z.lazy(() =>
  z.union([
    PositionSchema,
    PolarPositionSchema,
    NodeTargetSchema,
    OffsetPositionSchema,
    BetweenPositionSchema,
  ]),
);

/** BetweenPosition schema：`{ between: [AbsoluteTarget, AbsoluteTarget], t: 0..1 }` */
export const BetweenPositionSchema: z.ZodType<IRBetweenPosition> = z.lazy(() =>
  z
    .object({
      between: z
        .tuple([AbsoluteTargetSchema, AbsoluteTargetSchema])
        .describe('Two endpoints (AbsoluteTarget each; path-relative excluded)'),
      t: z
        .number()
        .min(0)
        .max(1)
        .describe('Proportion along A→B, 0..1 (0 = A, 1 = B); extrapolation not supported'),
    })
    .describe(
      'Proportional point between two endpoints (TikZ `($(A)!t!(B)$)`); resolved to `lerp(A, B, t)` at compile time. Admitted into Node/Coordinate position and path Step.to.',
    ),
);
