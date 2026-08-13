import type { IRDropShadow } from '../../schemas';

/** 展开投影预设与静态默认后的完整内部形态 */
export type CanonicalDropShadow = Omit<IRDropShadow, 'preset'> &
  Required<Pick<IRDropShadow, 'offsetX' | 'offsetY' | 'color'>>;
