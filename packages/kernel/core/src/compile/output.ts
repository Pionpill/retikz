import type { AxisAlignedBounds } from '@retikz/math';

import { collectLayoutBounds } from './scene';
import type { CompileOutput } from './shared';

/** 汇总输出的可见布局边界，保留各项阴影扩张语义 */
export const computeCompileOutputBounds = (contributions: CompileOutput['bounds']): AxisAlignedBounds | undefined => {
  let bounds: AxisAlignedBounds | undefined;
  for (const contribution of contributions) {
    bounds = collectLayoutBounds(bounds, contribution.boundsPoints, contribution.shadow);
  }
  return bounds;
};
