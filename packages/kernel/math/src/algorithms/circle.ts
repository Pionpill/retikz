import type { Position } from '../primitives';

import { DEFAULT_EPSILON } from '../constants';
import { vector2 } from '../primitives';
import { triangle } from './triangle';

/** 圆：圆心 + 半径 */
export type Circle = { center: Position; radius: number };

/**
 * 以两点连线为直径构造圆
 * @description 返回刚好经过 a / b 的最小圆；两点重合时半径为 0
 */
const createCircleFromDiameterPoints = (a: Position, b: Position): Circle => ({
  center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  radius: vector2.length([a[0] - b[0], a[1] - b[1]]) / 2,
});

/**
 * 以三点构造候选最小圆
 * @description 非共线时返回三角形外接圆；共线或近似共线时退化为三组两点直径圆中半径最大的圆
 */
const createCircleFromThreePoints = (a: Position, b: Position, c: Position): Circle => {
  const circumcircle = triangle.circumCircle(a, b, c);
  if (circumcircle) return circumcircle;
  let largestCircle = createCircleFromDiameterPoints(a, b);
  const circleAC = createCircleFromDiameterPoints(a, c);
  const circleBC = createCircleFromDiameterPoints(b, c);
  if (circleAC.radius > largestCircle.radius) largestCircle = circleAC;
  if (circleBC.radius > largestCircle.radius) largestCircle = circleBC;
  return largestCircle;
};

/**
 * 判断点是否落在圆内或圆边界上
 * @description 使用 epsilon 扩张半径，抵消浮点误差对边界点的影响
 */
const isPointWithinCircle = (circle: Circle, point: Position, epsilon: number): boolean =>
  vector2.length([point[0] - circle.center[0], point[1] - circle.center[1]]) <= circle.radius + epsilon;

/** 圆相关几何算法 */
export const circle = {
  /**
   * 点集的最小外接圆（Welzl 迭代式）
   * @description 覆盖输入点集的最小圆；空集返回 null
   * @remarks 复杂度：时间最坏 O(n^3)，空间 O(1)，n 为输入点数
   */
  minimalEnclosing: (points: Array<Position>, epsilon = DEFAULT_EPSILON): Circle | null => {
    const n = points.length;
    if (n === 0) return null;
    let c: Circle = { center: [points[0][0], points[0][1]], radius: 0 };
    for (let i = 1; i < n; i++) {
      if (isPointWithinCircle(c, points[i], epsilon)) continue;
      c = { center: [points[i][0], points[i][1]], radius: 0 };
      for (let j = 0; j < i; j++) {
        if (isPointWithinCircle(c, points[j], epsilon)) continue;
        c = createCircleFromDiameterPoints(points[i], points[j]);
        for (let k = 0; k < j; k++) {
          if (isPointWithinCircle(c, points[k], epsilon)) continue;
          c = createCircleFromThreePoints(points[i], points[j], points[k]);
        }
      }
    }
    return c;
  },
};
