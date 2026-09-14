import { resolveBoxSpacing } from '@retikz/core';

import type { IRLayoutContainerBox } from '../../composites/shared';
import { LayoutContainerBoxSchema } from '../../composites/shared';
import type { CanonicalLayoutContainerBox } from './types';

/** 为容器补全双轴策略并展开 padding；不修改作者 Source */
export const resolveLayoutContainerBox = (source: IRLayoutContainerBox): CanonicalLayoutContainerBox => ({
  size: {
    x: source.size?.x ?? LayoutContainerBoxSchema.shape.size.parse(undefined).x,
    y: source.size?.y ?? LayoutContainerBoxSchema.shape.size.parse(undefined).y,
  },
  padding: resolveBoxSpacing(source.padding, 0),
  overflow: source.overflow ?? LayoutContainerBoxSchema.shape.overflow.parse(undefined),
});
