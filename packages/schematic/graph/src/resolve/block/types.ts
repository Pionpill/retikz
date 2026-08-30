import type { IRBlock } from '../../schemas';

/** Block resolve 后保留呈现字段并确定固定 slots Graph context 的结构 */
export type CanonicalBlock = Readonly<{
  source: IRBlock;
}>;
