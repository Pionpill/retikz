import type { IRChild } from '@retikz/core';

import type { IRGroup } from '../../schemas';

/** Group resolve 后保留呈现字段并确定 Graph context 的结构 */
export type CanonicalGroup = Readonly<{
  source: IRGroup;
  children: ReadonlyArray<IRChild>;
}>;
