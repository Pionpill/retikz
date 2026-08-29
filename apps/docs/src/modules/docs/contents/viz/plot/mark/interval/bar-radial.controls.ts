import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { rainfall } from './bar-radial.data';

/** 径向柱内半径 playground 的稳定控件 id */
export const BAR_RADIAL_INNER_RADIUS_ID = 'bar-radial-inner-radius';
export const BAR_RADIAL_GAP_ID = 'bar-radial-gap';

/** 径向柱坐标的中文属性面板 */
export const barRadialControls = definePreviewControls({
  presentation: 'panel',
  title: '径向柱',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'rainfall', label: '月度降雨', rows: rainfall }],
    },
    {
      label: '极坐标',
      controls: [
        {
          kind: 'range',
          id: BAR_RADIAL_INNER_RADIUS_ID,
          label: '内半径',
          defaultValue: 0,
          min: 0,
          max: 0.7,
          step: 0.1,
        },
        {
          kind: 'range',
          id: BAR_RADIAL_GAP_ID,
          label: '柱间距',
          defaultValue: 0,
          min: 0,
          max: 0.8,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 径向柱内半径 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: barRadialControls,
  canonicalValues: { [BAR_RADIAL_INNER_RADIUS_ID]: 0, [BAR_RADIAL_GAP_ID]: 0 },
  relatedApis: ['IntervalMark.x', 'IntervalMark.y', 'PlotScale.paddingInner', 'PlotScale.paddingOuter'],
} satisfies PreviewControlContract;
