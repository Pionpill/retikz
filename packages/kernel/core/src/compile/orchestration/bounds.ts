import type { AxisAlignedBounds } from '@retikz/math';

import { boundsOf, expandBounds, mergeBounds } from '@retikz/math';

import type { IRPosition, ResolvedDropShadow } from '../../schemas';

/** 返回 shadow 影响后的外溢 bbox */
const expandBoundsForShadow = (
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
