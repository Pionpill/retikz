import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { cities } from './legend.data';

/** 尺寸图例示例的中文控件 */
export const legendSizeControls = definePreviewControls({
  presentation: 'panel',
  title: '尺寸图例',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '人口样本',
          rows: cities,
          columns: [
            { key: 'lng', label: '横坐标' },
            { key: 'lat', label: '纵坐标' },
            { key: 'pop', label: '人口' },
          ],
        },
      ],
    },
    {
      label: '布局',
      controls: [
        {
          kind: 'select',
          id: 'position',
          label: '位置',
          defaultValue: 'bottom',
          options: [
            { value: 'right', label: '右侧' },
            { value: 'left', label: '左侧' },
            { value: 'top', label: '顶部' },
            { value: 'bottom', label: '底部' },
          ],
        },
        {
          kind: 'select',
          id: 'orient',
          label: '排列方向',
          defaultValue: 'auto',
          options: [
            { value: 'auto', label: '跟随位置' },
            { value: 'vertical', label: '纵向' },
            { value: 'horizontal', label: '横向' },
          ],
        },
      ],
    },
    {
      label: '符号',
      controls: [
        { kind: 'range', id: 'symbolSize', label: '目标尺寸', defaultValue: 18, min: 10, max: 36, step: 2 },
        {
          kind: 'select',
          id: 'symbolFit',
          label: '适配方式',
          defaultValue: 'fit',
          options: [
            { value: 'fit', label: '压入目标盒' },
            { value: 'preserve', label: '保留实绘半径' },
          ],
        },
      ],
    },
  ],
});

/** 尺寸图例示例的稳定文档契约 */
export const previewControlContract = {
  controls: legendSizeControls,
  canonicalValues: { position: 'bottom', orient: 'auto', symbolSize: 18, symbolFit: 'fit' },
  relatedApis: [
    'PlotLegend.position',
    'PlotLegend.orient',
    'PlotLegend.style.symbolSize',
    'PlotLegend.style.symbolFit',
  ],
} satisfies PreviewControlContract;
