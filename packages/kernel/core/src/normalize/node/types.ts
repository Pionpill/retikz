import type { BoundsInsets } from '@retikz/math';

import type { IRNode } from '../../schemas';

/** 展开 Node 盒模型与缩放简写后的完整内部形态 */
export type CanonicalNode = Omit<IRNode, 'padding' | 'margin' | 'minimumSize' | 'scale'> & {
  /** 完整内边距 */
  padding: BoundsInsets;
  /** 完整外边距 */
  margin: BoundsInsets;
  /** 完整最小尺寸 */
  minimumSize: {
    /** 最小宽度 */
    width: number;
    /** 最小高度 */
    height: number;
  };
  /** 完整轴向缩放 */
  scale: {
    /** x 轴缩放 */
    x: number;
    /** y 轴缩放 */
    y: number;
  };
};
