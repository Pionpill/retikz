/** 2D vector [x, y]. */
export type Vector2 = [number, number];

/** Cartesian position [x, y]. */
export type Position = Vector2;

/** Default tolerance used by geometry helpers. */
export const DEFAULT_EPSILON = 1e-9;

/** Finite number guard; rejects Infinity and NaN. */
export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Infinite number guard; accepts only positive or negative Infinity. */
export const isInfiniteNumber = (value: unknown): value is number =>
  value === Infinity || value === -Infinity;

/** Basic 2D point/vector operations. */
export const point = {
  /** Vector addition: a + b. */
  add: (a: Position, b: Position): Position => [a[0] + b[0], a[1] + b[1]],
  /** Vector subtraction: a - b. */
  sub: (a: Position, b: Position): Position => [a[0] - b[0], a[1] - b[1]],
  /** Scalar multiplication: a * k. */
  scale: (a: Position, k: number): Position => [a[0] * k, a[1] * k],
  /** Dot product: a . b. */
  dot: (a: Position, b: Position): number => a[0] * b[0] + a[1] * b[1],
  /** 2D cross product scalar: a x b. */
  cross: (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0],
  /** Vector length. */
  length: (a: Position): number => Math.hypot(a[0], a[1]),
  /** Normalize a vector; zero-length vectors return fallback. */
  normalize: (a: Position, fallback: Position = [1, 0], epsilon = DEFAULT_EPSILON): Position => {
    const len = Math.hypot(a[0], a[1]);
    if (len < epsilon) return fallback;
    return [a[0] / len, a[1] / len];
  },
  /** Move point p toward target by dist. */
  shiftToward: (p: Position, target: Position, dist: number): Position => {
    if (dist === 0) return p;
    const delta: Position = [target[0] - p[0], target[1] - p[1]];
    const dir = point.normalize(delta, [0, 0]);
    if (point.equal(dir, [0, 0])) return p;
    return [p[0] + dir[0] * dist, p[1] + dir[1] * dist];
  },
  /** Exact equality without tolerance. */
  equal: (a: Position, b: Position): boolean => a[0] === b[0] && a[1] === b[1],
};

/** Semantic vector helpers; Vector2 and Position share the same tuple representation. */
export const vector2 = {
  /** Position tuple -> Vector2 tuple. */
  fromPosition: (p: Position): Vector2 => [p[0], p[1]],
  /** Angle in degrees -> unit vector. */
  fromAngleDegrees: (angle: number): Vector2 => {
    const radians = angle * Math.PI / 180;
    return [Math.cos(radians), Math.sin(radians)];
  },
  /** Normalize a vector; zero-length vectors return fallback. */
  normalize: (v: Vector2, fallback: Vector2 = [1, 0], epsilon = DEFAULT_EPSILON): Vector2 =>
    point.normalize(v, fallback, epsilon),
};

/** Linear interpolation: a + (b - a) * t. */
export const lerp = (a: Position, b: Position, t: number): Position => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
