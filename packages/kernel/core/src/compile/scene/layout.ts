import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';

import { boundsOf, boundsToRect, expandBounds, isFiniteBoundsRect } from '@retikz/math';

import type { IRPosition } from '../../schemas';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 对 layout 四字段应用输出精度 */
export const roundLayout = ({ height, width, x, y }: BoundsRect, round: (n: number) => number): BoundsRect => ({
  x: round(x),
  y: round(y),
  width: round(width),
  height: round(height),
});

/** 校验自动 layout 不含非 finite 值 */
export const assertFiniteLayout = (layout: BoundsRect): BoundsRect => {
  if (!isFiniteBoundsRect(layout)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Node layout produced non-finite bounds (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check shape geometry (e.g. extreme radius).`,
    );
  }
  return layout;
};

/** 由 bbox 算出布局边界；无 bbox 时返回 100x100 兜底 */
export const computeLayoutFromBounds = (
  bounds: AxisAlignedBounds | undefined,
  padding: number,
  round: (n: number) => number,
): BoundsRect => {
  if (bounds === undefined) return { x: 0, y: 0, width: 100, height: 100 };
  const padded = expandBounds(bounds, { left: padding, right: padding, top: padding, bottom: padding });
  return roundLayout(boundsToRect(padded), round);
};

/** 由 bbox 候选点算出布局边界；保留给既有调用方使用 */
export const computeLayout = (
  boundsPoints: ReadonlyArray<IRPosition>,
  padding: number,
  round: (n: number) => number,
): BoundsRect => computeLayoutFromBounds(boundsOf(boundsPoints), padding, round);
