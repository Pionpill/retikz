import { type PolarPosition, polar } from './polar';

/** 笛卡尔坐标点 [x, y] */
export type Position = [number, number];

const RAD_TO_DEG = 180 / Math.PI;
const DEFAULT_EPSILON = 1e-9;

/** 二维向量 / 坐标的基础运算工具集 */
export const point = {
  /** 向量加 a + b */
  add: (a: Position, b: Position): Position => [a[0] + b[0], a[1] + b[1]],
  /** 向量减 a - b */
  sub: (a: Position, b: Position): Position => [a[0] - b[0], a[1] - b[1]],
  /** 等比缩放 a * k */
  scale: (a: Position, k: number): Position => [a[0] * k, a[1] * k],
  /** 向量长度 */
  length: (a: Position): number => Math.hypot(a[0], a[1]),
  /** 归一化向量；零长度 / 极短向量回退到 fallback */
  normalize: (
    a: Position,
    fallback: Position = [1, 0],
    epsilon = DEFAULT_EPSILON,
  ): Position => {
    const len = Math.hypot(a[0], a[1]);
    if (len < epsilon) return fallback;
    return [a[0] / len, a[1] / len];
  },
  /** 把点 p 沿 target 方向移动 dist */
  shiftToward: (p: Position, target: Position, dist: number): Position => {
    if (dist === 0) return p;
    const delta: Position = [target[0] - p[0], target[1] - p[1]];
    const dir = point.normalize(delta, [0, 0]);
    if (point.equal(dir, [0, 0])) return p;
    return [p[0] + dir[0] * dist, p[1] + dir[1] * dist];
  },
  /** 两点精确相等（不带容差） */
  equal: (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1],
  /** 笛卡尔 → 极坐标（angle ∈ (-180,180]，origin 默认 [0,0]） */
  toPolar: (p: Position): PolarPosition => ({
    angle: Math.atan2(p[1], p[0]) * RAD_TO_DEG,
    radius: Math.hypot(p[0], p[1]),
  }),
  /**
   * 跨坐标系两点相同判断（笛卡尔或 PolarPosition）
   * @description 极坐标先转笛卡尔再按 precision 四舍五入比较；polar.equal 委托到本方法
   * @param precision 小数点后位数；默认 2
   * @throws 当 PolarPosition.origin 是节点 id 字符串时（需 Scene 上下文）
   */
  equalPolar: (
    a: Position | PolarPosition,
    b: Position | PolarPosition,
    precision = 2,
  ): boolean => {
    const aCart = Array.isArray(a) ? a : polar.toPosition(a);
    const bCart = Array.isArray(b) ? b : polar.toPosition(b);
    const factor = 10 ** precision;
    return (
      Math.round(aCart[0] * factor) === Math.round(bCart[0] * factor) &&
      Math.round(aCart[1] * factor) === Math.round(bCart[1] * factor)
    );
  },
};
