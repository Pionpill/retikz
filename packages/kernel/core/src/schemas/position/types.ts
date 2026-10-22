import type { IRAtPosition } from './at-position';
import type { IRBetweenPosition } from './between-position';
import type { IROffsetPosition } from './offset-position';
import type { PolarPosition } from './polar-position';
import type { IRPosition } from './position';

/** compile position 解析器支持的完整输入形态 */
export type IRResolvablePosition =
  | IRPosition
  | PolarPosition
  | IRAtPosition
  | IROffsetPosition
  | IRBetweenPosition
  | string;
