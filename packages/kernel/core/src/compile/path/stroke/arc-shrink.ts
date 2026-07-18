import { DEFAULT_EPSILON } from '@retikz/math';

import type { ArcPathCommand, EllipseArcPathCommand } from '../../../contract';
import type { IRPosition } from '../../../schemas';

import { alignAngleSweep, DEG_TO_RAD, RAD_TO_DEG } from '../../../shared/geometry';

type ArcCommand = ArcPathCommand | EllipseArcPathCommand;

const ARC_LENGTH_TOLERANCE = 1e-7;
const MAX_INTEGRATION_DEPTH = 12;
const ANGLE_BISECTION_STEPS = 48;

/** 解析弧命令的实际有向扫描区间 */
export const resolveArcSweep = (command: ArcCommand): { start: number; end: number } => {
  const counterClockwise = command.counterClockwise ?? command.endAngle < command.startAngle;
  return alignAngleSweep(command.startAngle, command.endAngle, counterClockwise);
};

/** 计算弧命令在给定参数角上的点，包含 ellipseArc rotation */
export const arcCommandPointAt = (command: ArcCommand, angleDeg: number): IRPosition => {
  const angle = angleDeg * DEG_TO_RAD;
  const radiusX = command.kind === 'arc' ? command.radius : command.radiusX;
  const radiusY = command.kind === 'arc' ? command.radius : command.radiusY;
  const rotation = command.kind === 'ellipseArc' ? (command.rotation ?? 0) * DEG_TO_RAD : 0;
  const x = radiusX * Math.cos(angle);
  const y = radiusY * Math.sin(angle);
  return [
    command.center[0] + x * Math.cos(rotation) - y * Math.sin(rotation),
    command.center[1] + x * Math.sin(rotation) + y * Math.cos(rotation),
  ];
};

/** 椭圆参数角每变化一度对应的弧长速度，单位为 user units / degree */
const ellipseSpeed = (radiusX: number, radiusY: number, angleDeg: number): number => {
  const angle = angleDeg * DEG_TO_RAD;
  return Math.hypot(radiusX * Math.sin(angle), radiusY * Math.cos(angle)) * DEG_TO_RAD;
};

/** 使用确定性的自适应 Simpson 积分计算椭圆参数角区间弧长 */
const integrateEllipseLength = (radiusX: number, radiusY: number, startAngle: number, endAngle: number): number => {
  const from = Math.min(startAngle, endAngle);
  const to = Math.max(startAngle, endAngle);
  if (to - from <= DEFAULT_EPSILON) return 0;

  const integrate = (left: number, right: number, whole: number, tolerance: number, depth: number): number => {
    const middle = (left + right) / 2;
    const leftMiddle = (left + middle) / 2;
    const rightMiddle = (middle + right) / 2;
    const leftEstimate =
      ((middle - left) / 6) *
      (ellipseSpeed(radiusX, radiusY, left) +
        4 * ellipseSpeed(radiusX, radiusY, leftMiddle) +
        ellipseSpeed(radiusX, radiusY, middle));
    const rightEstimate =
      ((right - middle) / 6) *
      (ellipseSpeed(radiusX, radiusY, middle) +
        4 * ellipseSpeed(radiusX, radiusY, rightMiddle) +
        ellipseSpeed(radiusX, radiusY, right));
    const refined = leftEstimate + rightEstimate;
    if (depth >= MAX_INTEGRATION_DEPTH || Math.abs(refined - whole) <= 15 * tolerance) {
      return refined + (refined - whole) / 15;
    }
    return (
      integrate(left, middle, leftEstimate, tolerance / 2, depth + 1) +
      integrate(middle, right, rightEstimate, tolerance / 2, depth + 1)
    );
  };

  const middle = (from + to) / 2;
  const whole =
    ((to - from) / 6) *
    (ellipseSpeed(radiusX, radiusY, from) +
      4 * ellipseSpeed(radiusX, radiusY, middle) +
      ellipseSpeed(radiusX, radiusY, to));
  return integrate(from, to, whole, ARC_LENGTH_TOLERANCE, 0);
};

/** 计算弧命令当前扫描区间的总长度 */
const arcLength = (command: ArcCommand, startAngle: number, endAngle: number): number => {
  if (command.kind === 'arc') {
    return Math.abs(endAngle - startAngle) * DEG_TO_RAD * Math.abs(command.radius);
  }
  return integrateEllipseLength(Math.abs(command.radiusX), Math.abs(command.radiusY), startAngle, endAngle);
};

/** 从有向扫描起点沿弧长前进，反解对应参数角 */
const angleAtDistance = (command: ArcCommand, startAngle: number, endAngle: number, distance: number): number => {
  const totalLength = arcLength(command, startAngle, endAngle);
  if (totalLength <= DEFAULT_EPSILON) return startAngle;
  const clamped = Math.max(0, Math.min(distance, totalLength));
  if (clamped <= DEFAULT_EPSILON) return startAngle;
  if (totalLength - clamped <= DEFAULT_EPSILON) return endAngle;

  if (command.kind === 'arc') {
    const direction = endAngle >= startAngle ? 1 : -1;
    return startAngle + direction * (clamped / Math.abs(command.radius)) * RAD_TO_DEG;
  }

  let low = 0;
  let high = 1;
  for (let index = 0; index < ANGLE_BISECTION_STEPS; index += 1) {
    const middle = (low + high) / 2;
    const candidate = startAngle + (endAngle - startAngle) * middle;
    const length = arcLength(command, startAngle, candidate);
    if (length < clamped) low = middle;
    else high = middle;
  }
  return startAngle + (endAngle - startAngle) * ((low + high) / 2);
};

/** 从起点按实际弧长裁剪命令 */
export const trimArcStart = (command: ArcCommand, distance: number): ArcCommand => {
  const sweep = resolveArcSweep(command);
  const startAngle = angleAtDistance(command, sweep.start, sweep.end, Math.max(0, distance));
  return { ...command, startAngle, endAngle: sweep.end };
};

/** 从终点按实际弧长反向裁剪命令 */
export const trimArcEnd = (command: ArcCommand, distance: number): ArcCommand => {
  const sweep = resolveArcSweep(command);
  const totalLength = arcLength(command, sweep.start, sweep.end);
  const endAngle = angleAtDistance(command, sweep.start, sweep.end, Math.max(0, totalLength - Math.max(0, distance)));
  return { ...command, startAngle: sweep.start, endAngle };
};
