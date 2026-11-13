import { alignAngleSweep } from '../primitives';
import type { CurveSegment } from './curve';

/** 一段曲线的只读累计长度模型，独立于查询位置 */
export type CurveLengthModel = Readonly<{
  /** 原始曲线，不得在模型生命周期内修改 */
  segment: CurveSegment;
  /** 自适应区间边界的参数 */
  parameters: ReadonlyArray<number>;
  /** 对应参数边界的累计长度 */
  distances: ReadonlyArray<number>;
  /** 全曲线长度 */
  length: number;
  /** 局部距离查询的绝对容差 */
  tolerance: number;
}>;

/** 曲线在归一化参数处的速率 */
const speedAt = (segment: CurveSegment, parameter: number): number => {
  const inverse = 1 - parameter;
  if (segment.kind === 'line') return Math.hypot(segment.to[0] - segment.from[0], segment.to[1] - segment.from[1]);
  if (segment.kind === 'quadraticBezier') {
    return Math.hypot(
      2 * (inverse * (segment.control[0] - segment.from[0]) + parameter * (segment.to[0] - segment.control[0])),
      2 * (inverse * (segment.control[1] - segment.from[1]) + parameter * (segment.to[1] - segment.control[1])),
    );
  }
  if (segment.kind === 'cubicBezier') {
    const derivative = (axis: 0 | 1) =>
      3 *
      (inverse * inverse * (segment.control1[axis] - segment.from[axis]) +
        2 * inverse * parameter * (segment.control2[axis] - segment.control1[axis]) +
        parameter * parameter * (segment.to[axis] - segment.control2[axis]));
    return Math.hypot(derivative(0), derivative(1));
  }
  const { start, end } = alignAngleSweep(
    segment.startAngleDeg,
    segment.endAngleDeg,
    segment.counterClockwise ?? segment.endAngleDeg < segment.startAngleDeg,
  );
  const sweep = ((end - start) * Math.PI) / 180;
  if (segment.kind === 'arc') return Math.abs(segment.radius * sweep);
  const angle = (start * Math.PI) / 180 + parameter * sweep;
  return Math.abs(sweep) * Math.hypot(segment.radiusX * Math.sin(angle), segment.radiusY * Math.cos(angle));
};

/** 五点 Gauss 求积，仅用于准备区间或已定位区间内的局部求精 */
const integrateSpeed = (segment: CurveSegment, from: number, to: number): number => {
  const middle = (from + to) / 2;
  const half = (to - from) / 2;
  return (
    half *
    (0.5688888888888889 * speedAt(segment, middle) +
      0.4786286704993665 *
        (speedAt(segment, middle - half * 0.5384693101056831) + speedAt(segment, middle + half * 0.5384693101056831)) +
      0.2369268850561891 *
        (speedAt(segment, middle - half * 0.906179845938664) + speedAt(segment, middle + half * 0.906179845938664)))
  );
};

/** 在单调边界表中找到包含目标的区间，内部接缝归后一段 */
const intervalAt = (boundaries: ReadonlyArray<number>, target: number): number => {
  let lower = 0;
  let upper = boundaries.length - 1;
  while (lower + 1 < upper) {
    const middle = (lower + upper) >>> 1;
    if (boundaries[middle] <= target) lower = middle;
    else upper = middle;
  }
  return lower;
};

/** 准备可反复查询的曲线长度模型；非有限或细分预算耗尽时返回 null */
const prepare = (segment: CurveSegment): CurveLengthModel | null => {
  if (segment.kind === 'line' || segment.kind === 'arc') {
    const length = speedAt(segment, 0);
    return Number.isFinite(length)
      ? { segment, parameters: [0, 1], distances: [0, length], length, tolerance: Math.max(1e-6, length * 1e-6) }
      : null;
  }
  let seedCount = 16;
  if (segment.kind === 'ellipseArc') {
    const { start, end } = alignAngleSweep(
      segment.startAngleDeg,
      segment.endAngleDeg,
      segment.counterClockwise ?? segment.endAngleDeg < segment.startAngleDeg,
    );
    seedCount = Math.max(seedCount, Math.ceil(Math.abs(end - start) / 45));
  }
  if (!Number.isFinite(seedCount) || seedCount > 65536) return null;
  let estimate = 0;
  for (let index = 0; index < seedCount; index++)
    estimate += integrateSpeed(segment, index / seedCount, (index + 1) / seedCount);
  if (!Number.isFinite(estimate)) return null;
  const tolerance = Math.max(1e-6, estimate * 1e-6);
  const parameters = [0];
  const distances = [0];
  let length = 0;
  const appendInterval = (from: number, to: number, depth: number): boolean => {
    const middle = (from + to) / 2;
    const whole = integrateSpeed(segment, from, to);
    const left = integrateSpeed(segment, from, middle);
    const right = integrateSpeed(segment, middle, to);
    const refined = left + right;
    if (!Number.isFinite(refined) || parameters.length >= 65536) return false;
    if (Math.abs(refined - whole) > (tolerance * (to - from)) / 32) {
      if (depth >= 24 || middle === from || middle === to) return false;
      return appendInterval(from, middle, depth + 1) && appendInterval(middle, to, depth + 1);
    }
    // 保留两半边界，查询只在已验证的小区间中积分
    length += left;
    parameters.push(middle);
    distances.push(length);
    length += right;
    parameters.push(to);
    distances.push(length);
    return true;
  };
  for (let index = 0; index < seedCount; index++) {
    if (!appendInterval(index / seedCount, (index + 1) / seedCount, 0)) return null;
  }
  return { segment, parameters, distances, length, tolerance };
};

/** 复用单调度量表，计算曲线参数对应的前缀长度 */
const distanceAt = (model: CurveLengthModel, parameter: number): number => {
  if (parameter <= 0) return 0;
  if (parameter >= 1) return model.length;
  if (model.segment.kind === 'line' || model.segment.kind === 'arc') return parameter * model.length;
  const index = intervalAt(model.parameters, parameter);
  return Math.min(
    model.distances[index + 1],
    model.distances[index] + integrateSpeed(model.segment, model.parameters[index], parameter),
  );
};

/** 先二分累计表，再在命中区间内反解距离，不重新测量整条曲线 */
const parameterAt = (model: CurveLengthModel, distance: number): number => {
  if (distance <= 0 || model.length === 0) return 0;
  if (distance >= model.length) return 1;
  if (model.segment.kind === 'line' || model.segment.kind === 'arc') return distance / model.length;
  const index = intervalAt(model.distances, distance);
  // 精确累计边界直接返回参数，避免驻点附近的距离容差掩盖接缝方向
  if (Math.abs(distance - model.distances[index]) <= Number.EPSILON * model.length * 8) return model.parameters[index];
  if (Math.abs(distance - model.distances[index + 1]) <= Number.EPSILON * model.length * 8)
    return model.parameters[index + 1];
  let lower = model.parameters[index];
  let upper = model.parameters[index + 1];
  for (let iteration = 0; iteration < 48; iteration++) {
    const middle = (lower + upper) / 2;
    const measured = model.distances[index] + integrateSpeed(model.segment, model.parameters[index], middle);
    if (Math.abs(measured - distance) <= model.tolerance / 32) return middle;
    if (measured < distance) lower = middle;
    else upper = middle;
  }
  return (lower + upper) / 2;
};

/** 曲线长度准备与无状态位置查询 */
export const curveMetrics = { prepare, distanceAt, parameterAt };
