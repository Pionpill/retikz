import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './legend.data';

/** 形状与透明度图例示例的中文控件 */
export const legendShapeOpacityControls = definePreviewControls({
  presentation: 'panel',
  title: '形状与透明度图例',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '城市样本',
          rows: cities,
          columns: [
            { key: 'lng', label: '横坐标' },
            { key: 'lat', label: '纵坐标' },
            { key: 'region', label: '区域' },
            { key: 'pop', label: '人口' },
          ],
        },
      ],
    },
    {
      label: '形状图例',
      controls: [
        { kind: 'switch', id: 'showShape', label: '显示', defaultValue: true },
        {
          kind: 'select',
          id: 'shapePosition',
          label: '位置',
          defaultValue: 'right',
          visibleWhen: { controlId: 'showShape', oneOf: [true] },
          options: [
            { value: 'right', label: '右侧' },
            { value: 'left', label: '左侧' },
            { value: 'top', label: '顶部' },
            { value: 'bottom', label: '底部' },
          ],
        },
      ],
    },
    {
      label: '透明度图例',
      controls: [
        { kind: 'switch', id: 'showOpacity', label: '显示', defaultValue: true },
        {
          kind: 'select',
          id: 'opacityPosition',
          label: '位置',
          defaultValue: 'bottom',
          visibleWhen: { controlId: 'showOpacity', oneOf: [true] },
          options: [
            { value: 'right', label: '右侧' },
            { value: 'left', label: '左侧' },
            { value: 'top', label: '顶部' },
            { value: 'bottom', label: '底部' },
          ],
        },
        {
          kind: 'range',
          id: 'tickCount',
          label: '目标刻度数',
          defaultValue: 4,
          min: 2,
          max: 7,
          step: 1,
          visibleWhen: { controlId: 'showOpacity', oneOf: [true] },
        },
      ],
    },
  ],
});

/** 形状与透明度图例示例的稳定文档契约 */
export const previewControlContract = {
  controls: legendShapeOpacityControls,
  canonicalValues: {
    showShape: true,
    shapePosition: 'right',
    showOpacity: true,
    opacityPosition: 'bottom',
    tickCount: 4,
  },
  relatedApis: ['Legend.channel', 'Legend.position', 'Legend.ticks'],
} satisfies PreviewControlContract;
