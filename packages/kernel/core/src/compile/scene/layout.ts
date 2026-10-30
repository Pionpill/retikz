import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';
import { boundsOf, boundsToRect, expandBounds, isFiniteBoundsRect } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRPosition } from '../../schemas';

/** 对 layout 四字段应用输出精度 */
export const roundLayout = ({ height, width, x, y }: BoundsRect, round: (n: number) => number): BoundsRect => ({
  x: round(x),
  y: round(y),
  width: round(width),
  height: round(height),
});

/** 由 bbox 算出有限的 Scene 布局边界；无 bbox 时返回 100x100 兜底 */
export const computeLayoutFromBounds = (
  bounds: AxisAlignedBounds | undefined,
  padding: number,
  round: (n: number) => number,
): BoundsRect => {
  if (bounds === undefined) return { x: 0, y: 0, width: 100, height: 100 };
  const padded = expandBounds(bounds, { left: padding, right: padding, top: padding, bottom: padding });
  const layout = roundLayout(boundsToRect(padded), round);

  if (!isFiniteBoundsRect(layout)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Scene layout produced non-finite bounds (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check geometry, padding, and rounding for numeric overflow.`,
    );
  }

  return layout;
};

/** 由 bbox 候选点算出布局边界；保留给既有调用方使用 */
export const computeLayout = (
  boundsPoints: ReadonlyArray<IRPosition>,
  padding: number,
  round: (n: number) => number,
): BoundsRect => computeLayoutFromBounds(boundsOf(boundsPoints), padding, round);
