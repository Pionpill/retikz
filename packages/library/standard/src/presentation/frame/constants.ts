import type { ValueOf } from '@retikz/foundation';
/** Frame 标题区的排列方向 */
export const FrameHeaderDirection = {
  Horizontal: 'horizontal',
  Vertical: 'vertical',
} as const;

/** Frame 标题区排列方向取值 */
export type FrameHeaderDirection = ValueOf<typeof FrameHeaderDirection>;
