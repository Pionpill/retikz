import type { Position } from '@retikz/math';

/** 根据横向偏移返回圆与圆分支的两个圆心 */
export const circleCircleCenters = (offset: number): [Position, Position] => [
  [-45, 0],
  [offset, 0],
];
