import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { coordinate2DRows } from './coordinate-2d.data';

/** 笛卡尔二维坐标系示例的中文控件 */
export const coordinateCartesianControls = definePreviewControls({
  presentation: 'panel',
  title: '笛卡尔二维坐标系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '分类数值',
          rows: coordinate2DRows,
          columns: [{ key: 'category' }, { key: 'value' }],
        },
      ],
    },
    {
      label: '图元',
      controls: [
        {
          kind: 'select',
          id: 'markType',
          label: '图元类型',
          defaultValue: 'point',
          options: [
            { value: 'point', label: '点' },
            { value: 'line', label: '线' },
            { value: 'interval', label: '面' },
          ],
        },
      ],
    },
    {
      label: '绘图区',
      controls: [
        {
          kind: 'range',
          id: 'marginTop',
          label: '上留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginRight',
          label: '右留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginBottom',
          label: '下留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
        {
          kind: 'range',
          id: 'marginLeft',
          label: '左留白',
          defaultValue: 24,
          min: 8,
          max: 64,
          step: 4,
        },
      ],
    },
    {
      label: '坐标辅助',
      controls: [
        {
          kind: 'switch',
          id: 'showGrid',
          label: '显示 y 网格',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 笛卡尔二维坐标系示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCartesianControls,
  canonicalValues: {
    markType: 'point',
    marginTop: 24,
    marginRight: 24,
    marginBottom: 24,
    marginLeft: 24,
    showGrid: true,
  },
  relatedApis: ['PointMark', 'PathMark', 'IntervalMark', 'Plot.margin', 'PlotAxis.grid'],
} satisfies PreviewControlContract;
