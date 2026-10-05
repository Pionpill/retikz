import type { IRChild } from '@retikz/core';

import type { IRGraphSurfaceDefaults, IRGroup } from '../../schemas';

/** Group resolve 后保留呈现字段并确定 Graph context 的结构 */
export type CanonicalGroup = Readonly<{
  /** 当前可见分组的 Graph IR 输入 */
  source: IRGroup;
  /** 继续下沉的有序绘制子内容 */
  children: ReadonlyArray<IRChild>;
  /** 当前 Core Theme 解析后的 Group 根 Surface appearance */
  shellAppearance: IRGraphSurfaceDefaults;
}>;
