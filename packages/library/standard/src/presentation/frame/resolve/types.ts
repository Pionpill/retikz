import type { resolveBoxSpacing } from '@retikz/core';

import type { IRFrame } from '..';

/** 已确定边框、盒模型和标题排列的 Frame */
export type CanonicalFrame = Omit<IRFrame, 'padding' | 'border'> &
  Required<Pick<IRFrame, 'localNamespace' | 'boundingShape' | 'gap' | 'headerDirection'>> & {
    /** 已展开为四边数值的内容框内边距 */
    padding: ReturnType<typeof resolveBoxSpacing>;
    /** 已补齐描边样式的内容框边框配置 */
    border: NonNullable<IRFrame['border']> & Required<Pick<NonNullable<IRFrame['border']>, 'style'>>;
  };
