import { DEG_TO_RAD, isFinitePoint, vector2 } from '@retikz/math';
import type { Position } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import { DEFAULT_BEND_LOOSENESS } from './constants';

/** 控制点坐标无效时报告错误 */
const assertFiniteBendControls = (control1: Position, control2: Position): void => {
  if (!isFinitePoint(control1) || !isFinitePoint(control2)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      'Bend produced a non-finite control point (looseness / angle too large); use smaller values.',
    );
  }
};

/**
 * 计算连接两点的弯曲路径控制点
 * @description 按行进方向向左或向右弯曲，角度单位为度；起终点重合时返回该点
 */
export const bendControlPoints = (
  from: Position,
  to: Position,
  direction: 'left' | 'right',
  bendAngle: number,
): [Position, Position] => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const chord = Math.hypot(dx, dy);
  if (chord === 0)
    return [
      [from[0], from[1]],
      [from[0], from[1]],
    ];

  const sign = direction === 'left' ? 1 : -1;
  const nx = (dy / chord) * sign;
  const ny = (-dx / chord) * sign;

  const apexOffset = (chord / 2) * Math.tan((bendAngle * DEG_TO_RAD) / 2);
  const ctlOffset = (4 / 3) * apexOffset;

  const c1: Position = [from[0] + dx / 3 + ctlOffset * nx, from[1] + dy / 3 + ctlOffset * ny];
  const c2: Position = [from[0] + (2 * dx) / 3 + ctlOffset * nx, from[1] + (2 * dy) / 3 + ctlOffset * ny];
  assertFiniteBendControls(c1, c2);

  return [c1, c2];
};

/**
 * 按两端的方向和松紧程度计算曲线控制点
 * @description 角度单位为度，松紧倍率越大，控制点离端点越远；起终点重合时可用于绘制自环
 */
export const outInControlPoints = (
  from: Position,
  to: Position,
  outAngle: number,
  inAngle: number,
  looseness?: number,
): [Position, Position] => {
  const k = looseness ?? DEFAULT_BEND_LOOSENESS;
  const chord = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const distance = chord === 0 ? 1 : chord / 3;
  const d = k * distance;
  const outDir = vector2.fromAngleDegrees(outAngle);
  const inDir = vector2.fromAngleDegrees(inAngle);
  const c1: Position = [from[0] + d * outDir[0], from[1] + d * outDir[1]];
  const c2: Position = [to[0] + d * inDir[0], to[1] + d * inDir[1]];
  assertFiniteBendControls(c1, c2);

  return [c1, c2];
};
