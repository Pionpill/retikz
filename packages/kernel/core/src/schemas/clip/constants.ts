import type { ValueOf } from '@retikz/foundation';

/** 裁切路径填充规则 */
export const ClipFillRule = {
  /** 非零环绕数规则 */
  NonZero: 'nonzero',
  /** 奇偶填充规则 */
  EvenOdd: 'evenodd',
} as const;

/** 裁切路径填充规则取值 */
export type ClipFillRule = ValueOf<typeof ClipFillRule>;
