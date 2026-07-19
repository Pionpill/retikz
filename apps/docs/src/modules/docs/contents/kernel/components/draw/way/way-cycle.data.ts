import type { WayItem } from '@retikz/core';

import { DrawWay } from '@retikz/core';

type WayCyclePresentation = {
  /** 当前状态传给 Draw 的完整 way */
  way: Array<WayItem>;
  /** 是否显示缺失回边的 dotted 辅助线 */
  showClosingGuide: boolean;
  /** 当前状态使用的填充色 */
  fill: 'none' | 'dodgerblue';
};

/** Way 开放与闭合状态的完整视觉映射 */
export const WayCyclePresentationByState = {
  open: {
    way: ['A.center', 'B.center', 'C.center'],
    showClosingGuide: true,
    fill: 'none',
  },
  closed: {
    way: ['A.center', 'B.center', 'C.center', DrawWay.Cycle],
    showClosingGuide: false,
    fill: 'dodgerblue',
  },
} satisfies Record<'open' | 'closed', WayCyclePresentation>;
