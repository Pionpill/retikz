import type { resolveBoxSpacing } from '@retikz/core';

import type { IRLayoutContainerBox } from '../../composites/shared';

/** 已展开双轴策略和盒模型的容器配置 */
export type CanonicalLayoutContainerBox = Required<Omit<IRLayoutContainerBox, 'size' | 'padding'>> & {
  /** 已补齐两个轴的容器尺寸策略 */
  size: Required<NonNullable<IRLayoutContainerBox['size']>>;
  /** 已展开为四边数值的容器内边距 */
  padding: ReturnType<typeof resolveBoxSpacing>;
};
