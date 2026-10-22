import type { ValueOf } from '@retikz/foundation';

/** 位置输入引用的最终坐标角色范围边界 */
export const PositionEdge = {
  /** 最终映射范围的起点，跟随范围反转 */
  Start: 'start',
  /** 最终映射范围的终点，跟随范围反转 */
  End: 'end',
} as const;

export type PositionEdge = ValueOf<typeof PositionEdge>;
