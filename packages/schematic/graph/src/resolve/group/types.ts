import type { IRChild } from '@retikz/core';

import type { GraphSurfaceThemeStyleTokens } from '../../contract';
import type { IRGroup } from '../../schemas';

/** Group resolve 后保留呈现字段并确定 Graph context 的结构 */
export type CanonicalGroup = Readonly<{
  source: IRGroup;
  children: ReadonlyArray<IRChild>;
  /** 当前 Core Theme 解析后的 Group 根 Surface appearance */
  shellAppearance: GraphSurfaceThemeStyleTokens;
}>;
