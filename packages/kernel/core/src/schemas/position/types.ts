import type { IRAtPosition } from './at-position';
import type { IRBetweenPosition } from './between-position';
import type { IROffsetPosition } from './offset-position';
import type { PolarPosition } from './polar-position';
import type { IRPosition } from './position';

/** 可作为基础引用点解析的 position 输入。 */
export type IRPositionReferent = string | IRPosition | PolarPosition;

/** compile position 解析器支持的完整输入形态。 */
export type IRResolvablePosition =
  | IRPosition
  | PolarPosition
  | IRAtPosition
  | IROffsetPosition
  | IRBetweenPosition
  | string;
