import type { CurveSegmentSample, Position } from '@retikz/math';
import { curve, point } from '@retikz/math';

/*
 * Core 专属的段参数采样工具。
 * fold 与 rectangle 具有 Step / mark 的既有参数归属，普通曲线由 @retikz/math 的 `curve` 统一计算。
 * label.position 把 t 映射 0.25/0.5/0.75（near-start/midway/near-end）。
 *
 * 参数化约定：
 * - 直线/贝塞尔：标准参数（line t·(to-from)+from；Bezier 标准式）
 * - fold：各腿均分 t，分界点归前一腿；零长腿借用最近非零腿切线
 * - arc：angle(t) = startAngle + t·(end-start)；切线沿扫描方向
 * - circle/ellipse：angle = t·360°，从 0°(east) 开始
 */

/**
 * 获取折线路径上指定比例处的位置和前进方向
 * @description 每段均分 0 到 1 的比例范围，不按长度分配；没有拐点时按直线处理
 */
export const foldSegmentSample = (
  from: Position,
  cornerOrCorners: Position | ReadonlyArray<Position>,
  to: Position,
  t: number,
): CurveSegmentSample => {
  const corners =
    cornerOrCorners.length === 0 || Array.isArray(cornerOrCorners[0])
      ? (cornerOrCorners as ReadonlyArray<Position>)
      : [cornerOrCorners as Position];
  const points = [from, ...corners, to];
  const legCount = points.length - 1;
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * legCount;
  const legIndex = scaled === 0 ? 0 : Math.min(Math.ceil(scaled) - 1, legCount - 1);
  const localT = scaled - legIndex;
  const sample = curve.sampleAt({ kind: 'line', from: points[legIndex], to: points[legIndex + 1] }, localT);
  if (!point.isEqual(points[legIndex], points[legIndex + 1])) return sample;

  for (let distance = 1; distance < legCount; distance += 1) {
    const previous = legIndex - distance;
    if (previous >= 0 && !point.isEqual(points[previous], points[previous + 1])) {
      return {
        point: sample.point,
        tangent: curve.sampleAt({ kind: 'line', from: points[previous], to: points[previous + 1] }, 0).tangent,
      };
    }

    const next = legIndex + distance;
    if (next < legCount && !point.isEqual(points[next], points[next + 1])) {
      return {
        point: sample.point,
        tangent: curve.sampleAt({ kind: 'line', from: points[next], to: points[next + 1] }, 0).tangent,
      };
    }
  }

  return sample;
};

/**
 * 获取矩形边框上指定比例处的位置和前进方向
 * @description 从左上角顺时针绕行，每条边占四分之一的比例范围；按直角矩形计算，不包含圆角
 */
export const rectPerimeterSample = (from: Position, to: Position, t: number): CurveSegmentSample => {
  const x0 = Math.min(from[0], to[0]);
  const x1 = Math.max(from[0], to[0]);
  const y0 = Math.min(from[1], to[1]);
  const y1 = Math.max(from[1], to[1]);

  // 与 rectOutline 同序 / 同向：左上 → 右上 → 右下 → 左下 → 闭合回左上
  const corners: Array<Position> = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
    [x0, y0],
  ];
  const clamped = t <= 0 ? 0 : t >= 1 ? 1 : t;
  const scaled = clamped * 4;
  const edge = Math.min(Math.floor(scaled), 3);
  const localT = scaled - edge;

  return curve.sampleAt({ kind: 'line', from: corners[edge], to: corners[edge + 1] }, localT);
};
