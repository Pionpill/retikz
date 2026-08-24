import type { Position } from './point';

/** 轴对齐外接范围 */
export type AxisAlignedBounds = {
  /** 最小 x 坐标 */
  minX: number;
  /** 最小 y 坐标 */
  minY: number;
  /** 最大 x 坐标 */
  maxX: number;
  /** 最大 y 坐标 */
  maxY: number;
};

/** 左上角 + 尺寸表示的轴对齐外接矩形 */
export type BoundsRect = {
  /** 左上角 x 坐标 */
  x: number;
  /** 左上角 y 坐标 */
  y: number;
  /** 矩形宽度 */
  width: number;
  /** 矩形高度 */
  height: number;
};

/** 轴对齐外接范围半轴 */
export type BoundsHalfAxes = {
  /** x 方向半宽 */
  halfWidth: number;
  /** y 方向半高 */
  halfHeight: number;
};

/** 轴对齐外接范围外扩量 */
export type BoundsInsets = {
  /** 向左外扩距离 */
  left: number;
  /** 向右外扩距离 */
  right: number;
  /** 向上外扩距离 */
  top: number;
  /** 向下外扩距离 */
  bottom: number;
};

/**
 * 点集的轴对齐外接范围
 * @description 输入为空时返回 undefined；调用方按自身语义决定兜底、报错或忽略
 */
export const boundsOf = (points: ReadonlyArray<Position>): AxisAlignedBounds | undefined => {
  if (points.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { maxX, maxY, minX, minY };
};

/** 合并两个轴对齐外接范围 */
export const mergeBounds = (a?: AxisAlignedBounds, b?: AxisAlignedBounds): AxisAlignedBounds | undefined => {
  if (a === undefined) return b === undefined ? undefined : { ...b };
  if (b === undefined) return { ...a };
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
};

/** 将 min/max bounds 转成左上角 + 尺寸矩形 */
export const boundsToRect = ({ maxX, maxY, minX, minY }: AxisAlignedBounds): BoundsRect => ({
  x: minX,
  y: minY,
  width: maxX - minX,
  height: maxY - minY,
});

/** 将左上角 + 尺寸矩形转成 min/max bounds */
export const rectToBounds = ({ height, width, x, y }: BoundsRect): AxisAlignedBounds => ({
  minX: x,
  minY: y,
  maxX: x + width,
  maxY: y + height,
});

/** 判断 bounds rect 四个字段是否都是 finite number */
export const isFiniteBoundsRect = ({ height, width, x, y }: BoundsRect): boolean =>
  Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(width) && Number.isFinite(height);

/** 判断 bounds rect 是否 finite 且宽高严格大于 0 */
export const isPositiveBoundsRect = (rect: BoundsRect): boolean =>
  isFiniteBoundsRect(rect) && rect.width > 0 && rect.height > 0;

/** 轴对齐外接范围中心 */
export const centerOfBounds = ({ maxX, maxY, minX, minY }: AxisAlignedBounds): Position => [
  (minX + maxX) / 2,
  (minY + maxY) / 2,
];

/** 轴对齐外接范围半轴 */
export const halfAxesOfBounds = ({ maxX, maxY, minX, minY }: AxisAlignedBounds): BoundsHalfAxes => ({
  halfWidth: (maxX - minX) / 2,
  halfHeight: (maxY - minY) / 2,
});

/** 按四边外扩轴对齐外接范围 */
export const expandBounds = (
  { maxX, maxY, minX, minY }: AxisAlignedBounds,
  { bottom, left, right, top }: BoundsInsets,
): AxisAlignedBounds => ({
  minX: minX - left,
  minY: minY - top,
  maxX: maxX + right,
  maxY: maxY + bottom,
});

/** 轴对齐外接范围的四个角点 */
export const cornersOfBounds = ({ maxX, maxY, minX, minY }: AxisAlignedBounds): Array<Position> => [
  [minX, minY],
  [maxX, minY],
  [minX, maxY],
  [maxX, maxY],
];
