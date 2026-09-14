import type { resolveBoxSpacing } from '@retikz/core';

import type { IRFrame } from '../../composites/presentation/frame';

/** 已确定边框、盒模型和标题排列的 Frame */
export type CanonicalFrame = Omit<IRFrame, 'padding' | 'border'> &
  Required<Pick<IRFrame, 'localNamespace' | 'boundingShape' | 'gap' | 'headerDirection'>> & {
    padding: ReturnType<typeof resolveBoxSpacing>;
    border: NonNullable<IRFrame['border']> & Required<Pick<NonNullable<IRFrame['border']>, 'style'>>;
  };
