import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** GridLayout 轨道分配的中文属性面板 */
export const gridLayoutPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '网格布局参数',
  sections: [
    {
      label: '辅助层',
      controls: [
        {
          kind: 'switch',
          id: 'inspect',
          label: '显示布局辅助线',
          defaultValue: true,
        },
      ],
    },
    {
      label: '轨道与自动放置',
      controls: [
        {
          kind: 'select',
          id: 'autoFlow',
          label: '自动放置方向',
          defaultValue: 'row',
          options: [
            { value: 'row', label: '按行' },
            { value: 'column', label: '按列' },
          ],
        },
        { kind: 'range', id: 'fraction', label: '第二列份额', defaultValue: 2, min: 1, max: 4, step: 1 },
        { kind: 'range', id: 'columnGap', label: '列间距', defaultValue: 8, min: 0, max: 24, step: 2 },
        { kind: 'range', id: 'rowGap', label: '行间距', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
    {
      label: '单元格对齐',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: '水平对齐',
          defaultValue: 'stretch',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'stretch', label: '拉伸' },
          ],
        },
        {
          kind: 'select',
          id: 'alignItems',
          label: '垂直对齐',
          defaultValue: 'center',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'stretch', label: '拉伸' },
          ],
        },
      ],
    },
  ],
});

/** 当前 GridLayout playground 的稳定文档契约 */
export const previewControlContract = {
  controls: gridLayoutPlaygroundControls,
  canonicalValues: {
    inspect: true,
    autoFlow: 'row',
    fraction: 2,
    columnGap: 8,
    rowGap: 8,
    justifyItems: 'stretch',
    alignItems: 'center',
  },
  relatedApis: [
    'GridLayout.inspect',
    'GridLayout.autoFlow',
    'GridLayout.columns',
    'GridLayout.columnGap',
    'GridLayout.rowGap',
    'GridLayout.justifyItems',
    'GridLayout.alignItems',
  ],
} satisfies PreviewControlContract;
