import type { Position } from '@retikz/math';

/** 求交 playground 的固定取景范围 */
export const intersectionViewBox = { x: -195, y: -125, width: 390, height: 250 } as const;

/** 根据横向偏移返回圆与圆分支的两个圆心 */
export const circleCircleCenters = (offset: number): [Position, Position] => [
  [-45, 0],
  [offset, 0],
];
