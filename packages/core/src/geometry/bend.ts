import type { Position } from './point';

/**
 * cubic Bezier 拟合 from→to 的弧形 bend
 * @description apex offset = chord × tan(bendAngle/2)；控制点取 chord 1/3 与 2/3 处沿法向偏移，让 cubic 在 t=0.5 穿过 apex 故 ctlOffset = 4/3 × apexOffset。法向（screen y-down）：visual-left=(dy,-dx)/|chord|，visual-right=(-dy,dx)/|chord|。chord=0 时两控制点都返回 from
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
  if (chord === 0) return [[from[0], from[1]], [from[0], from[1]]];

  const sign = direction === 'left' ? 1 : -1;
  const nx = (dy / chord) * sign;
  const ny = (-dx / chord) * sign;

  const apexOffset = chord * Math.tan((bendAngle * Math.PI) / 180 / 2);
  const ctlOffset = (4 / 3) * apexOffset;

  const c1: Position = [from[0] + dx / 3 + ctlOffset * nx, from[1] + dy / 3 + ctlOffset * ny];
  const c2: Position = [from[0] + (2 * dx) / 3 + ctlOffset * nx, from[1] + (2 * dy) / 3 + ctlOffset * ny];
  return [c1, c2];
};
