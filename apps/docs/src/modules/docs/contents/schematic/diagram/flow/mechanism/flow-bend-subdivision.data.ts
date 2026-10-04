import { bendControlPoints } from '@retikz/core';
import type { BoundsRect, CubicBezierCurveSegment } from '@retikz/math';
import { curve } from '@retikz/math';

/** 两张图共用的障碍盒，B 在弯曲内侧，C 在整曲线包围盒外 */
export const bendObstacles = [
  { id: 'A', x: 36, y: 58, width: 12, height: 12 },
  { id: 'B', x: 90, y: 55, width: 20, height: 50 },
  { id: 'C', x: 160, y: 145, width: 20, height: 16 },
];

/** 复用正式 bend 几何，示意图不手绘控制点 */
export const bendFigureCurve = (angle = 60, direction: 'left' | 'right' = 'left'): CubicBezierCurveSegment => {
  const from: [number, number] = [0, 100];
  const to: [number, number] = [200, 100];
  const [control1, control2] = bendControlPoints(from, to, direction, angle);
  return { kind: 'cubicBezier', from, to, control1, control2 };
};

/** 子曲线的真实极值 AABB */
export const bendFigureBounds = (start: number, end: number): BoundsRect => {
  const part = curve.slice(bendFigureCurve(), start, end);
  const x = curve.projectedRange(part, [1, 0]);
  const y = curve.projectedRange(part, [0, 1]);
  return { x: x.min, y: y.min, width: x.max - x.min, height: y.max - y.min };
};
