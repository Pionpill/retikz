import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';
import { boundsOf, boundsToRect, expandBounds } from '@retikz/math';

import type { Transform } from '../../contract';
import type { CanonicalDropShadow, IRPosition } from '../../schemas';
import { applyTransformChain } from '../shared';
import type { CompileOutput } from './types';

/** 把 bounds 字段中的负零规范化为稳定的正零 */
export const canonicalizeBoundsRect = (bounds: Readonly<BoundsRect>): Readonly<BoundsRect> =>
  Object.freeze({
    x: Object.is(bounds.x, -0) ? 0 : bounds.x,
    y: Object.is(bounds.y, -0) ? 0 : bounds.y,
    width: Object.is(bounds.width, -0) ? 0 : bounds.width,
    height: Object.is(bounds.height, -0) ? 0 : bounds.height,
  });

/** 返回 shadow 影响后的外溢 bbox */
export const expandBoundsForShadow = (
  bounds: AxisAlignedBounds,
  shadow: CanonicalDropShadow | undefined,
): AxisAlignedBounds => {
  if (shadow === undefined) return bounds;

  const dx = shadow.offsetX;
  const dy = shadow.offsetY;
  const blur = shadow.blur ?? 0;

  return expandBounds(bounds, {
    left: blur + Math.max(0, -dx),
    right: blur + Math.max(0, dx),
    top: blur + Math.max(0, -dy),
    bottom: blur + Math.max(0, dy),
  });
};

/** 将几何点及其 shadow 外溢范围合并到自动 layout bbox */
export const mergeLayoutBounds = (
  current: AxisAlignedBounds | undefined,
  boundsPoints: ReadonlyArray<IRPosition>,
  canon?: CanonicalDropShadow,
): AxisAlignedBounds | undefined => {
  const bounds = boundsOf(boundsPoints);
  if (bounds === undefined) return current;

  // ⚡只修改本次计算创建的边界，省去每项合并的额外副本及 rest 参数数组
  const expanded = expandBoundsForShadow(bounds, canon);
  if (current !== undefined) {
    expanded.minX = Math.min(current.minX, expanded.minX);
    expanded.minY = Math.min(current.minY, expanded.minY);
    expanded.maxX = Math.max(current.maxX, expanded.maxX);
    expanded.maxY = Math.max(current.maxY, expanded.maxY);
  }
  return expanded;
};

/** 将分配矩形转换为四角贡献点 */
export const allocationPointsOf = (bounds: Readonly<BoundsRect>): Array<IRPosition> => {
  return [
    [bounds.x, bounds.y],
    [bounds.x + bounds.width, bounds.y],
    [bounds.x, bounds.y + bounds.height],
    [bounds.x + bounds.width, bounds.y + bounds.height],
  ];
};

/** 合并两个可选矩形，保留空贡献语义 */
export const unionBoundsRects = (
  left: BoundsRect | undefined,
  right: BoundsRect | undefined,
): BoundsRect | undefined => {
  if (left === undefined) return right;
  if (right === undefined) return left;

  const minX = Math.min(left.x, right.x);
  const minY = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

/** 求矩形交集，无交集时返回 undefined */
export const intersectBoundsRects = (left: BoundsRect, right: BoundsRect): BoundsRect | undefined => {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const maxX = Math.min(left.x + left.width, right.x + right.width);
  const maxY = Math.min(left.y + left.height, right.y + right.height);

  return maxX < x || maxY < y ? undefined : { x, y, width: maxX - x, height: maxY - y };
};

/** 从贡献点计算轴对齐矩形，无点时不贡献边界 */
const calculatePointBounds = (points: ReadonlyArray<IRPosition>): BoundsRect | undefined => {
  const bounds = boundsOf(points);
  return bounds === undefined ? undefined : boundsToRect(bounds);
};

/** 投影矩形四角并重新计算轴对齐边界 */
export const projectBoundsRect = (rect: BoundsRect, transforms: ReadonlyArray<Transform>): BoundsRect | undefined =>
  calculatePointBounds([
    applyTransformChain([rect.x, rect.y], transforms),
    applyTransformChain([rect.x + rect.width, rect.y], transforms),
    applyTransformChain([rect.x + rect.width, rect.y + rect.height], transforms),
    applyTransformChain([rect.x, rect.y + rect.height], transforms),
  ]);

/** 汇总输出的可见布局边界，保留各项阴影扩张语义 */
export const calculateCompileOutputBounds = (contributions: CompileOutput['bounds']): AxisAlignedBounds | undefined => {
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of contributions) {
    bounds = mergeLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  return bounds;
};
