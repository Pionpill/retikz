import type { IRNodeTarget } from '../../path';
import type { PolarPosition } from '../polar-position';

import { type IROffsetPosition } from '../offset-position';
import { type IRPosition } from '../position';

/**
 * 自包含端点类型（partway between 的端点）
 * @description 笛卡尔 / 极坐标 / 节点引用 / offset 定位 / 嵌套 between；**明确排除** path-relative
 *   （`{ relative }` / `{ relativeAccumulate }`——它们需要"上一段终点"游标，在两点之间取点的语境无意义）。
 *   自包含让 between 端点不引 `TargetSchema`，避免 `Position` ↔ `Target` schema 成环。
 */
export type IRAbsoluteTarget = IRPosition | PolarPosition | IRNodeTarget | IROffsetPosition | IRBetweenPosition;

/**
 * 两端点之间按 fraction 取点（lerp）
 * @description `between` 两端点为 `AbsoluteTarget`（可嵌套 between）；`t ∈ [0,1]`（外插推迟）。
 *   compile 把两端点各 resolve 成世界坐标后 `lerpPoint(A, B, t)`。对应 TikZ `($(A)!t!(B)$)`。
 */
export type IRBetweenPosition = {
  between: [IRAbsoluteTarget, IRAbsoluteTarget];
  fraction: number;
};
