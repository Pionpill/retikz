import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { climate } from './scale-ordinal.data';

/** Ordinal 颜色比例尺 playground 的中文属性面板 */
export const scaleOrdinalControls = definePreviewControls({
  presentation: 'panel',
  title: '分类颜色比例尺',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'climate',
          label: '城市气温',
          rows: climate,
          columns: [
            { key: 'city', label: '城市' },
            { key: 'month', label: '月份' },
            { key: 'temp', label: '气温' },
          ],
        },
      ],
    },
    {
      label: '分类颜色',
      controls: [
        {
          kind: 'select',
          id: 'palette',
          label: '离散配色',
          defaultValue: 'default',
          options: [
            { value: 'default', label: '默认蓝橙' },
            { value: 'cool', label: '冷色蓝紫' },
            { value: 'warm', label: '暖色红黄' },
          ],
        },
        { kind: 'switch', id: 'showLegend', label: '显示图例', defaultValue: true },
      ],
    },
  ],
});

/** Ordinal 颜色比例尺 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: scaleOrdinalControls,
  canonicalValues: { palette: 'default', showLegend: true },
  relatedApis: ['Plot.plotTheme', 'PlotLegend.channel'],
} satisfies PreviewControlContract;
