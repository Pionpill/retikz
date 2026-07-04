import { boundsOf, expandBounds } from '@retikz/math';

import type { Layout } from '../../contract';
import type { IRPosition } from '../../schemas';

/** 由 bbox 候选点算出布局边界；无候选点时返回 100×100 兜底。 */
export const computeLayout = (boundsPoints: Array<IRPosition>, padding: number, round: (n: number) => number): Layout => {
  const bounds = boundsOf(boundsPoints);
  if (bounds === undefined) return { x: 0, y: 0, width: 100, height: 100 };
  const padded = expandBounds(bounds, { left: padding, right: padding, top: padding, bottom: padding });
  return {
    x: round(padded.minX),
    y: round(padded.minY),
    width: round(padded.maxX - padded.minX),
    height: round(padded.maxY - padded.minY),
  };
};
