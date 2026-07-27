import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { sales } from './bar-grouped.data';

/** 多系列柱形 playground 的稳定控件 id */
export const BAR_SERIES_MODE_ID = 'bar-series-mode';
export const BAR_SERIES_STACK_OFFSET_ID = 'bar-series-stack-offset';
export const BAR_SERIES_GAP_ID = 'bar-series-gap';

/** 多系列排列方式的中文属性面板 */
export const barSeriesControls = definePreviewControls({
  presentation: 'panel',
  title: '系列排列',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'sales', label: '分组销售', rows: sales }],
    },
    {
      label: '排列',
      controls: [
        {
          kind: 'select',
          id: BAR_SERIES_MODE_ID,
          label: '排列方式',
          defaultValue: 'stack',
          options: [
            { value: 'dodge', label: '并排' },
            { value: 'stack', label: '堆叠' },
            { value: 'normalize-stack', label: '百分比堆叠' },
          ],
        },
        {
          kind: 'select',
          id: BAR_SERIES_STACK_OFFSET_ID,
          label: '堆叠基线',
          defaultValue: 'zero',
          visibleWhen: { controlId: BAR_SERIES_MODE_ID, oneOf: ['stack'] },
          options: [
            { value: 'zero', label: '从零开始' },
            { value: 'normalize', label: '归一化' },
            { value: 'diverging', label: '正负分离' },
            { value: 'center', label: '居中' },
            { value: 'overlap', label: '重叠' },
          ],
        },
        {
          kind: 'range',
          id: BAR_SERIES_GAP_ID,
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

/** 多系列柱形 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: barSeriesControls,
  canonicalValues: {
    [BAR_SERIES_MODE_ID]: 'stack',
    [BAR_SERIES_STACK_OFFSET_ID]: 'zero',
    [BAR_SERIES_GAP_ID]: 0,
  },
  relatedApis: [
    'IntervalMark.series',
    'IntervalMark.group',
    'IntervalMark.arrangement',
    'IntervalMark.stackOffset',
    'Scale.paddingInner',
    'Scale.paddingOuter',
  ],
} satisfies PreviewControlContract;
