import type { AxisAlignedBounds } from '@retikz/math';

import { boundsOf, boundsToRect, expandBounds, isFiniteBoundsRect } from '@retikz/math';

import type { Layout } from '../../contract';
import type { IRPosition } from '../../schemas';

/** 对 layout 四字段应用输出精度。 */
export const roundLayout = ({ height, width, x, y }: Layout, round: (n: number) => number): Layout => ({
  x: round(x),
  y: round(y),
  width: round(width),
  height: round(height),
});

/** 校验自动 layout 不含非 finite 值。 */
export const assertFiniteLayout = (layout: Layout): Layout => {
  if (!isFiniteBoundsRect(layout)) {
    throw new Error(
      `Node layout produced non-finite bounds (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check shape geometry (e.g. extreme radius).`,
    );
  }
  return layout;
};

/** 由 bbox 算出布局边界；无 bbox 时返回 100x100 兜底。 */
export const computeLayoutFromBounds = (
  bounds: AxisAlignedBounds | undefined,
  padding: number,
  round: (n: number) => number,
): Layout => {
  if (bounds === undefined) return { x: 0, y: 0, width: 100, height: 100 };
  const padded = expandBounds(bounds, { left: padding, right: padding, top: padding, bottom: padding });
  return roundLayout(boundsToRect(padded), round);
};

/** 由 bbox 候选点算出布局边界；保留给既有调用方使用。 */
export const computeLayout = (
  boundsPoints: ReadonlyArray<IRPosition>,
  padding: number,
  round: (n: number) => number,
): Layout => computeLayoutFromBounds(boundsOf(boundsPoints), padding, round);
