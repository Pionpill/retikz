import type { resolveBoxSpacing } from '@retikz/core';

import type { IRLayoutContainerBox } from '../../composites/shared';

/** 已展开双轴策略和盒模型的容器配置 */
export type CanonicalLayoutContainerBox = Required<Omit<IRLayoutContainerBox, 'size' | 'padding'>> & {
  size: Required<NonNullable<IRLayoutContainerBox['size']>>;
  padding: ReturnType<typeof resolveBoxSpacing>;
};
