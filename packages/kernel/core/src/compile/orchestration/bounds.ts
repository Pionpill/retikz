import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';

import { boundsOf, expandBounds, mergeBounds } from '@retikz/math';

import type { IRPosition, ResolvedDropShadow } from '../../schemas';

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
  bounds: AxisAlignedBounds | undefined,
  shadow: ResolvedDropShadow | undefined,
): AxisAlignedBounds | undefined => {
  if (bounds === undefined || shadow === undefined) return bounds;

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
export const collectLayoutBounds = (
  current: AxisAlignedBounds | undefined,
  boundsPoints: ReadonlyArray<IRPosition>,
  shadow?: ResolvedDropShadow,
): AxisAlignedBounds | undefined => {
  const bounds = boundsOf(boundsPoints);
  return mergeBounds(mergeBounds(current, bounds), expandBoundsForShadow(bounds, shadow));
};
