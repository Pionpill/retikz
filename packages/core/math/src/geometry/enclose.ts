import { DEFAULT_EPSILON, type Position, point } from './point';
import { type Circle, triangle } from './triangle';

/** 两点为直径的圆（圆心 = 中点，半径 = 半距） */
const circleFrom2 = (a: Position, b: Position): Circle => ({
  center: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
  radius: point.length([a[0] - b[0], a[1] - b[1]]) / 2,
});

/** 过三点的最小外接圆；三点共线（circumcircle 退化）时回退为最远点对的直径圆（含中间点） */
const circleFrom3 = (a: Position, b: Position, c: Position): Circle => {
  const cc = triangle.circumcircle(a, b, c);
  if (cc) return cc;
  let best = circleFrom2(a, b);
  const ac = circleFrom2(a, c);
  const bc = circleFrom2(b, c);
  if (ac.radius > best.radius) best = ac;
  if (bc.radius > best.radius) best = bc;
  return best;
};

const inCircle = (c: Circle, p: Position, epsilon: number): boolean =>
  point.length([p[0] - c.center[0], p[1] - c.center[1]]) <= c.radius + epsilon;

/**
 * 点集的最小外接圆（Welzl 迭代式）
 * @description **确定性**实现（不 shuffle、不依赖 Math.random），可安全用于 compileToScene。
 *   空集返回 null；单点返回半径 0 的圆。O(n³) 最坏 / O(n) 期望，绘图量级点数够用。
 */
export const minimalEnclosingCircle = (
  points: Array<Position>,
  epsilon = DEFAULT_EPSILON,
): Circle | null => {
  const n = points.length;
  if (n === 0) return null;
  let c: Circle = { center: [points[0][0], points[0][1]], radius: 0 };
  for (let i = 1; i < n; i++) {
    if (inCircle(c, points[i], epsilon)) continue;
    c = { center: [points[i][0], points[i][1]], radius: 0 };
    for (let j = 0; j < i; j++) {
      if (inCircle(c, points[j], epsilon)) continue;
      c = circleFrom2(points[i], points[j]);
      for (let k = 0; k < j; k++) {
        if (inCircle(c, points[k], epsilon)) continue;
        c = circleFrom3(points[i], points[j], points[k]);
      }
    }
  }
  return c;
};
