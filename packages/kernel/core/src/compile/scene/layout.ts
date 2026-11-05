import type { AxisAlignedBounds, BoundsRect } from '@retikz/math';
import { boundsToRect, expandBounds, isFiniteBoundsRect, isPositiveBoundsRect } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRViewBox } from '../../schemas';

/** 对 layout 四字段应用输出精度 */
export const roundLayout = ({ height, width, x, y }: BoundsRect, round: (n: number) => number): BoundsRect => ({
  x: round(x),
  y: round(y),
  width: round(width),
  height: round(height),
});

/** 由 bbox 算出有限的 Scene 布局边界；无 bbox 时返回 100x100 兜底 */
export const calculateLayoutFromBounds = (
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

/** 把显式 viewBox 转为 Scene.layout，确保取整后坐标有限且宽高为正 */
export const viewBoxToLayout = (viewBox: IRViewBox, round: (n: number) => number): BoundsRect => {
  const layout = roundLayout(viewBox, round);
  if (!isPositiveBoundsRect(layout)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `viewBox rounds to an invalid layout (x=${String(layout.x)}, y=${String(layout.y)}, width=${String(layout.width)}, height=${String(layout.height)}); check precision and coordinate magnitude.`,
    );
  }

  return layout;
};

/** 输出精度常量 */
export const DEFAULT_PRECISION = 2;

/** 创建 Scene 输出 rounder，并把 -0 归一为 0 */
export const createRound = (precision: number) => {
  const factor = 10 ** precision;
  return (n: number) => {
    const r = Math.round(n * factor) / factor;
    return r === 0 ? 0 : r;
  };
};
