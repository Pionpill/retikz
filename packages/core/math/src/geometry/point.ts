/** 笛卡尔坐标点 [x, y] */
export type Position = [number, number];

/** 几何计算默认容差 */
export const DEFAULT_EPSILON = 1e-9;

/** 二维向量 / 坐标的基础运算工具集 */
export const point = {
  /** 向量加 a + b */
  add: (a: Position, b: Position): Position => [a[0] + b[0], a[1] + b[1]],
  /** 向量减 a - b */
  sub: (a: Position, b: Position): Position => [a[0] - b[0], a[1] - b[1]],
  /** 等比缩放 a * k */
  scale: (a: Position, k: number): Position => [a[0] * k, a[1] * k],
  /** 点积 a · b */
  dot: (a: Position, b: Position): number => a[0] * b[0] + a[1] * b[1],
  /** 二维叉积 a × b（标量） */
  cross: (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0],
  /** 向量长度 */
  length: (a: Position): number => Math.hypot(a[0], a[1]),
  /** 归一化向量；零长度 / 极短向量回退到 fallback */
  normalize: (a: Position, fallback: Position = [1, 0], epsilon = DEFAULT_EPSILON): Position => {
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
};

/** 线性插值 a + (b − a)·t */
export const lerp = (a: Position, b: Position, t: number): Position => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
