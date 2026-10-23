import type { ValueOf } from '@retikz/foundation';

/** 标签标题与描述的排列方向 */
export const GroupCaptionDirection = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
} as const;

export type GroupCaptionDirection = ValueOf<typeof GroupCaptionDirection>;
