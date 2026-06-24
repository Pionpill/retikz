import { z } from 'zod';
import type { PolarPosition } from '../../geometry/polar';
import type { IRNodeTarget } from '../path/target';
import { NodeTargetSchema } from '../path/target';
import { type IROffsetPosition, OffsetPositionSchema } from './offset-position';
import { PolarPositionSchema } from './polar-position';
import { type IRPosition, PositionSchema } from './position';

/**
 * 自包含端点类型（partway between 的端点）
 * @description 笛卡尔 / 极坐标 / 节点引用 / offset 定位 / 嵌套 between；**明确排除** path-relative
 *   （`{ relative }` / `{ relativeAccumulate }`——它们需要"上一段终点"游标，在两点之间取点的语境无意义）。
 *   自包含让 between 端点不引 `TargetSchema`，避免 `Position` ↔ `Target` schema 成环。
 */
export type IRAbsoluteTarget =
  | IRPosition
  | PolarPosition
  | IRNodeTarget
  | IROffsetPosition
  | IRBetweenPosition;

/**
 * 两端点之间按比例 t 取点（lerp）
 * @description `between` 两端点为 `AbsoluteTarget`（可嵌套 between）；`t ∈ [0,1]`（外插推迟）。
 *   compile 把两端点各 resolve 成世界坐标后 `lerpPoint(A, B, t)`。对应 TikZ `($(A)!t!(B)$)`。
 */
export type IRBetweenPosition = {
  between: [IRAbsoluteTarget, IRAbsoluteTarget];
  t: number;
};

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
