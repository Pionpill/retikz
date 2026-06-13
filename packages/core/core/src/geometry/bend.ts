import type { Position } from './point';

/**
 * cubic Bezier 拟合 from→to 的弧形 bend
 * @description apex offset =（chord/2）× tan(bendAngle/2)，即弦切角为 bendAngle 的圆弧 sagitta；控制点取 chord 1/3 与 2/3 处沿法向偏移，让 cubic 在 t=0.5 穿过 apex 故 ctlOffset = 4/3 × apexOffset。法向（screen y-down）：visual-left=(dy,-dx)/|chord|，visual-right=(-dy,dx)/|chord|。chord=0 时两控制点都返回 from
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

  const apexOffset = (chord / 2) * Math.tan((bendAngle * Math.PI) / 180 / 2);
  const ctlOffset = (4 / 3) * apexOffset;

  const c1: Position = [from[0] + dx / 3 + ctlOffset * nx, from[1] + dy / 3 + ctlOffset * ny];
  const c2: Position = [from[0] + (2 * dx) / 3 + ctlOffset * nx, from[1] + (2 * dy) / 3 + ctlOffset * ny];
  return [c1, c2];
};

/** 默认 looseness（looseness 缺省时） */
const DEFAULT_LOOSENESS = 1;

/** self-loop（from==to）默认环大小（user units，受 looseness 缩放） */
const DEFAULT_LOOP_SIZE = 1;

/** 直边 cubic 控制点距离系数（chord 的几分之一）；retikz 取 1/3，TikZ 默认 looseness 对应 ≈0.3915，本库简化为 1/3 */
const OUTIN_DISTANCE_FACTOR = 1 / 3;

/** 角度（度）转单位方向向量（0°=+x，90°=+y screen-down，与 IR 角度约定一致） */
const dirOf = (angleDeg: number): Position => {
  const rad = (angleDeg * Math.PI) / 180;
  return [Math.cos(rad), Math.sin(rad)];
};

/**
 * out/in 角 + looseness 拟合 from→to 的非对称 cubic（含 self-loop 退化）
 * @description 标准 TikZ：control1 = from + d·dir(outAngle)，control2 = to + d·dir(inAngle)；
 *   d = looseness × distance，distance = chord × 系数（chord>0）或默认环大小（self-loop，from==to chord=0）。
 *   self-loop 时两控制点沿 out/in 两个不同方向各自从端点撑开，画出环（bend 对称弯在 chord=0 时退化为点，故 out/in 是自环唯一手段）。
 */
export const outInControlPoints = (
  from: Position,
  to: Position,
  outAngle: number,
  inAngle: number,
  looseness?: number,
): [Position, Position] => {
  const k = looseness ?? DEFAULT_LOOSENESS;
  const chord = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const distance = chord === 0 ? DEFAULT_LOOP_SIZE : chord * OUTIN_DISTANCE_FACTOR;
  const d = k * distance;
  const outDir = dirOf(outAngle);
  const inDir = dirOf(inAngle);
  const c1: Position = [from[0] + d * outDir[0], from[1] + d * outDir[1]];
  const c2: Position = [to[0] + d * inDir[0], to[1] + d * inDir[1]];
  return [c1, c2];
};
