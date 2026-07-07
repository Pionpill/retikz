import { DEFAULT_EPSILON } from '../constants';

/** 二维向量，格式为 `[x, y]`。 */
export type Vector2 = [number, number];

/** 笛卡尔坐标点，格式为 `[x, y]`。 */
export type Position = Vector2;

/** 有限数值守卫，会排除 Infinity 和 NaN。 */
export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** 有限二维点守卫。 */
export const isFinitePoint = (value: unknown): value is Position =>
  Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

/** 无限数值守卫，仅接受正负 Infinity。 */
export const isInfiniteNumber = (value: unknown): value is number => value === Infinity || value === -Infinity;

/** 二维点与向量运算；所有方法都返回新 tuple，不修改输入。 */
export const point = {
  /** 向量加法：`a + b`。 */
  add: (a: Position, b: Position): Position => [a[0] + b[0], a[1] + b[1]],
  /** 向量减法：`a - b`。 */
  sub: (a: Position, b: Position): Position => [a[0] - b[0], a[1] - b[1]],
  /** 标量乘法：`a * k`。 */
  scale: (a: Position, k: number): Position => [a[0] * k, a[1] * k],
  /** 点积。 */
  dot: (a: Position, b: Position): number => a[0] * b[0] + a[1] * b[1],
  /** 二维叉积标量。 */
  cross: (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0],
  /** 向量长度。 */
  length: (a: Position): number => Math.hypot(a[0], a[1]),
  /** 两点欧氏距离。 */
  distance: (a: Position, b: Position): number => Math.hypot(b[0] - a[0], b[1] - a[1]),
  /** 从 origin 沿 direction 前进指定长度。 */
  along: (origin: Position, direction: Vector2, length: number): Position => [
    origin[0] + direction[0] * length,
    origin[1] + direction[1] * length,
  ],
  /** 从 origin 逆 direction 后退指定长度。 */
  against: (origin: Position, direction: Vector2, length: number): Position => [
    origin[0] - direction[0] * length,
    origin[1] - direction[1] * length,
  ],
  /** 单位化向量；零长度时返回 fallback。 */
  normalize: (a: Position, fallback: Position = [1, 0], epsilon = DEFAULT_EPSILON): Position => {
    const len = Math.hypot(a[0], a[1]);
    if (len < epsilon) return fallback;
    return [a[0] / len, a[1] / len];
  },
  /** 将点 p 朝 target 移动指定距离。 */
  shiftToward: (p: Position, target: Position, dist: number): Position => {
    if (dist === 0) return p;
    const delta: Position = [target[0] - p[0], target[1] - p[1]];
    const dir = point.normalize(delta, [0, 0]);
    if (point.equal(dir, [0, 0])) return p;
    return [p[0] + dir[0] * dist, p[1] + dir[1] * dist];
  },
  /** 精确相等比较，不使用容差。 */
  equal: (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1],
};

/** 语义向量工具；Vector2 与 Position 共享同一 tuple 表示。 */
export const vector2 = {
  fromPosition: (p: Position): Vector2 => [p[0], p[1]],
  /** 角度（度）转单位向量。 */
  fromAngleDegrees: (angle: number): Vector2 => {
    const radians = (angle * Math.PI) / 180;
    return [Math.cos(radians), Math.sin(radians)];
  },
  /** 单位化向量；零长度时返回 fallback。 */
  normalize: (v: Vector2, fallback: Vector2 = [1, 0], epsilon = DEFAULT_EPSILON): Vector2 =>
    point.normalize(v, fallback, epsilon),
  /** 单位化向量；零长度或非有限长度时返回 null。 */
  normalizeOrNull: (v: Vector2, epsilon = 0): Vector2 | null => {
    const length = point.length(v);
    if (!Number.isFinite(length) || length <= epsilon) return null;
    return [v[0] / length, v[1] / length];
  },
  /** 左手法向量 `[-y, x]`；不改变输入长度。 */
  normal: (v: Vector2): Vector2 => [-v[1], v[0]],
};

/** 线性插值：a + (b - a) * t。 */
export const lerp = (a: Position, b: Position, t: number): Position => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
