import { DEFAULT_EPSILON } from '../constants';

/** 二维向量，格式为 `[x, y]` */
export type Vector2 = [number, number];

/** 笛卡尔坐标点，格式为 `[x, y]` */
export type Position = Vector2;

/**
 * 有限数值守卫，会排除 Infinity 和 NaN
 * @param value 待判定的动态值
 */
export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/**
 * 有限二维点守卫
 * @param value 待判定的动态值
 */
export const isFinitePoint = (value: unknown): value is Position =>
  Array.isArray(value) && value.length === 2 && isFiniteNumber(value[0]) && isFiniteNumber(value[1]);

/**
 * 无限数值守卫，仅接受正负 Infinity
 * @param value 待判定的动态值
 */
export const isInfiniteNumber = (value: unknown): value is number => value === Infinity || value === -Infinity;

/** 二维向量运算；不修改输入，单位化退化时可返回传入的 fallback 引用 */
export const vector2 = {
  /** 向量加法：`a + b` */
  add: (a: Vector2, b: Vector2): Vector2 => [a[0] + b[0], a[1] + b[1]],
  /** 向量减法：`a - b` */
  sub: (a: Vector2, b: Vector2): Vector2 => [a[0] - b[0], a[1] - b[1]],
  /** 标量乘法：`a * k` */
  scale: (a: Vector2, k: number): Vector2 => [a[0] * k, a[1] * k],
  /** 点积 */
  dot: (a: Vector2, b: Vector2): number => a[0] * b[0] + a[1] * b[1],
  /** 二维叉积标量 */
  cross: (a: Vector2, b: Vector2): number => a[0] * b[1] - a[1] * b[0],
  /** 向量长度 */
  length: (a: Vector2): number => Math.hypot(a[0], a[1]),
  /** 单位化向量；零长度时返回 fallback
   * @description fallback 默认 [1, 0]，epsilon 默认 DEFAULT_EPSILON；长度小于 epsilon 时返回 fallback 原引用
   */
  normalize: (a: Vector2, fallback: Vector2 = [1, 0], epsilon = DEFAULT_EPSILON): Vector2 => {
    const length = Math.hypot(a[0], a[1]);
    if (length < epsilon) return fallback;
    return [a[0] / length, a[1] / length];
  },
  /** 单位化向量；零长度或非有限长度时返回 null
   * @description epsilon 默认 0；长度非有限或小于等于 epsilon 时返回 null
   */
  normalizeOrNull: (a: Vector2, epsilon = 0): Vector2 | null => {
    const length = Math.hypot(a[0], a[1]);
    if (!Number.isFinite(length) || length <= epsilon) return null;
    return [a[0] / length, a[1] / length];
  },
  /** 角度（度）转单位向量 */
  fromAngleDegrees: (angle: number): Vector2 => {
    const radians = (angle * Math.PI) / 180;
    return [Math.cos(radians), Math.sin(radians)];
  },
  /** 左手法向量 `[-y, x]`；不改变输入长度 */
  normal: (a: Vector2): Vector2 => [-a[1], a[0]],
};

/** 点的位置关系运算；不修改输入，移动距离为零或两点重合时可返回原点引用 */
export const point = {
  /** 两点欧氏距离 */
  distance: (a: Position, b: Position): number => Math.hypot(b[0] - a[0], b[1] - a[1]),
  /**
   * 返回 origin + direction × length 对应的新坐标
   * @description 不自动单位化 direction；只有 direction 为单位向量时，实际位移长度才等于 length 的绝对值
   */
  along: (origin: Position, direction: Vector2, length: number): Position =>
    vector2.add(origin, vector2.scale(direction, length)),
  /**
   * 返回 origin - direction × length 对应的新坐标
   * @description 不自动单位化 direction；只有 direction 为单位向量时，实际位移长度才等于 length 的绝对值
   */
  against: (origin: Position, direction: Vector2, length: number): Position =>
    vector2.sub(origin, vector2.scale(direction, length)),
  /** 将 sourcePoint 朝 targetPoint 移动指定距离 */
  shiftToward: (sourcePoint: Position, targetPoint: Position, distance: number): Position => {
    if (distance === 0) return sourcePoint;
    const direction = vector2.normalize(vector2.sub(targetPoint, sourcePoint), [0, 0]);
    if (direction[0] === 0 && direction[1] === 0) return sourcePoint;
    return vector2.add(sourcePoint, vector2.scale(direction, distance));
  },
  /** 精确相等比较，不使用容差 */
  isEqual: (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1],
};

/**
 * 线性插值：a + (b - a) * t
 * @param a 起点
 * @param b 终点
 * @param t 插值参数；不限制在 0..1，区间外执行外插
 */
export const lerp = (a: Position, b: Position, t: number): Position => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
