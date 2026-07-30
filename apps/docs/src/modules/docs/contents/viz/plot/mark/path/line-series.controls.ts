import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './line-series.data';

/** 路径系列 playground 的稳定控件 id */
export const LINE_SERIES_CONTROL_IDS = {
  coordinate: 'path-series-coordinate',
  closed: 'path-series-closed',
  grouping: 'line-series-field',
  showLabels: 'line-series-show-labels',
} as const;

/** 兼容既有测试与源码引用的系列字段控件 id */
export const LINE_SERIES_CONTROL_ID = LINE_SERIES_CONTROL_IDS.grouping;

/** 路径系列的中文属性面板 */
export const lineSeriesControls = definePreviewControls({
  presentation: 'panel',
  title: '路径系列',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'climate', label: '城市气候', rows: climate }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: LINE_SERIES_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_SERIES_CONTROL_IDS.closed,
          label: '是否闭合',
          defaultValue: false,
          visibleWhen: { controlId: LINE_SERIES_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: '分组',
      controls: [
        {
          kind: 'select',
          id: LINE_SERIES_CONTROL_IDS.grouping,
          label: '拆分方式',
          defaultValue: 'series',
          options: [
            { value: 'series', label: '显式 series' },
            { value: 'color', label: '按 color 隐式拆分' },
            { value: 'none', label: '单条路径' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_SERIES_CONTROL_IDS.showLabels,
          label: '显示系列标签',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 路径系列 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineSeriesControls,
  canonicalValues: {
    [LINE_SERIES_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_SERIES_CONTROL_IDS.closed]: false,
    [LINE_SERIES_CONTROL_IDS.grouping]: 'series',
    [LINE_SERIES_CONTROL_IDS.showLabels]: true,
  },
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.series',
    'PathMark.color',
    'PathMark.label',
    'PathMark.order',
  ],
} satisfies PreviewControlContract;
