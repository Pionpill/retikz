import type { IRPosition, IRAtPosition, IRAbsoluteTarget } from '../../schemas';

/** 已补齐原点的极坐标表达式，引用在编译阶段求值 */
export type CanonicalPolarPosition = {
  origin: string | IRPosition | CanonicalPolarPosition;
  angle: number;
  radius: number;
};

/** 已确定偏移基点表达式的位置 */
export type CanonicalOffsetPosition = {
  of: string | IRPosition | CanonicalPolarPosition;
  offset: IRPosition;
};

/** 已补齐嵌套位置默认值的绝对目标 */
export type CanonicalAbsoluteTarget =
  | IRPosition
  | Extract<IRAbsoluteTarget, { id: string }>
  | CanonicalPolarPosition
  | CanonicalOffsetPosition
  | CanonicalBetweenPosition;

/** 已确定插值比例与两端表达式的位置 */
export type CanonicalBetweenPosition = {
  between: [CanonicalAbsoluteTarget, CanonicalAbsoluteTarget];
  fraction: number;
};

/** 静态默认值已补全的位置意图，引用仍待编译求值 */
export type CanonicalPosition =
  | IRPosition
  | CanonicalPolarPosition
  | CanonicalOffsetPosition
  | CanonicalBetweenPosition
  | Required<IRAtPosition>;

/** 位置默认值解析环境 */
export type PositionResolveContext = { nodeDistance: number };
