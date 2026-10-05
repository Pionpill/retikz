import type { BoundsRect, CurveSegment } from '@retikz/math';
import { curve, DEFAULT_EPSILON } from '@retikz/math';

/** 候选比较的私有空间分辨率（用户单位），不承诺精确避障 */
const CURVE_TOLERANCE = 0.25;

const MAX_DEPTH = 8;

/** 求曲线真极值包络 */
export const getFlowCurveBounds = (segment: CurveSegment): BoundsRect => {
  const x = curve.projectedRange(segment, [1, 0]);
  const y = curve.projectedRange(segment, [0, 1]);
  return { x: x.min, y: y.min, width: x.max - x.min, height: y.max - y.min };
};

/** 保守相交，包含相切与数值容差 */
export const doFlowBoundsOverlap = (a: Readonly<BoundsRect>, b: Readonly<BoundsRect>): boolean =>
  a.x <= b.x + b.width + DEFAULT_EPSILON &&
  b.x <= a.x + a.width + DEFAULT_EPSILON &&
  a.y <= b.y + b.height + DEFAULT_EPSILON &&
  b.y <= a.y + a.height + DEFAULT_EPSILON;

/** 求曲线与障碍盒可能接触的连续参数区间；未分离终端区间保守保留 */
export const findFlowCurveObstacleIntervals = (
  segment: CurveSegment,
  obstacle: Readonly<BoundsRect>,
  exemptStart = false,
  exemptEnd = false,
): Array<readonly [number, number]> => {
  const intervals: Array<[number, number]> = [];

  const visit = (part: CurveSegment, start: number, end: number, depth: number): void => {
    const bounds = getFlowCurveBounds(part);
    if (!doFlowBoundsOverlap(bounds, obstacle)) return;

    const contained =
      bounds.x >= obstacle.x &&
      bounds.y >= obstacle.y &&
      bounds.x + bounds.width <= obstacle.x + obstacle.width &&
      bounds.y + bounds.height <= obstacle.y + obstacle.height;
    if (contained || depth >= MAX_DEPTH || Math.max(bounds.width, bounds.height) <= CURVE_TOLERANCE) {
      const previous = intervals.at(-1);
      if (previous !== undefined && Math.abs(previous[1] - start) <= DEFAULT_EPSILON) previous[1] = end;
      else intervals.push([start, end]);

      return;
    }

    const middle = (start + end) / 2;
    visit(curve.slice(part, 0, 0.5), start, middle, depth + 1);
    visit(curve.slice(part, 0.5, 1), middle, end, depth + 1);
  };

  visit(segment, 0, 1, 0);

  return intervals.filter(([start, end]) => !(exemptStart && start === 0) && !(exemptEnd && end === 1));
};

/** Flow 对称 bend 未指定角度时的有序候选，顺序决定同分偏好 */
export const FLOW_BEND_ANGLES: ReadonlyArray<number> = [30, 45, 60];
