import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { axisCoordinateBasicsRows } from './axis-coordinate-basics.data';

/** 坐标系基础示例的中文控件 */
export const axisCoordinateBasicsControls = definePreviewControls({
  presentation: 'panel',
  title: '坐标系与轴职责',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '维度数值',
          rows: axisCoordinateBasicsRows,
          columns: [
            { key: 'dimension', label: '维度' },
            { key: 'value', label: '数值' },
            { key: 'order', label: '顺序' },
          ],
        },
      ],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: 'coordinate',
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
      ],
    },
    {
      label: '坐标轴',
      controls: [
        { kind: 'switch', id: 'showX', label: '显示 x / 角向轴', defaultValue: true },
        { kind: 'switch', id: 'showY', label: '显示 y / 径向轴', defaultValue: true },
        {
          kind: 'switch',
          id: 'showGrid',
          label: '显示 y / 径向网格',
          defaultValue: true,
          visibleWhen: { controlId: 'showY', oneOf: [true] },
        },
        {
          kind: 'range',
          id: 'tickCount',
          label: 'y / 径向刻度目标数',
          defaultValue: 5,
          min: 2,
          max: 8,
          step: 1,
          visibleWhen: { controlId: 'showY', oneOf: [true] },
        },
      ],
    },
  ],
});

/** 坐标系基础示例的稳定文档契约 */
export const previewControlContract = {
  controls: axisCoordinateBasicsControls,
  canonicalValues: {
    coordinate: 'cartesian2D',
    showX: true,
    showY: true,
    showGrid: true,
    tickCount: 5,
  },
  relatedApis: ['Plot.coordinate', 'PlotAxis.dimension', 'PlotAxis.grid', 'PlotAxis.ticks'],
} satisfies PreviewControlContract;
