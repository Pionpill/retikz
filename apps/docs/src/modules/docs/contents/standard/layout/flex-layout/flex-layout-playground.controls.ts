import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** FlexLayout 关键分配行为的中文属性面板 */
export const flexLayoutPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '弹性布局参数',
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
      label: '方向与换行',
      controls: [
        {
          kind: 'select',
          id: 'direction',
          label: '主轴方向',
          defaultValue: 'row',
          options: [
            { value: 'row', label: '横向' },
            { value: 'row-reverse', label: '横向反转' },
            { value: 'column', label: '纵向' },
            { value: 'column-reverse', label: '纵向反转' },
          ],
        },
        {
          kind: 'select',
          id: 'wrap',
          label: '换行',
          defaultValue: 'wrap',
          options: [
            { value: 'nowrap', label: '不换行' },
            { value: 'wrap', label: '换行' },
            { value: 'wrap-reverse', label: '反向换行' },
          ],
        },
      ],
    },
    {
      label: '对齐与分配',
      controls: [
        {
          kind: 'select',
          id: 'alignItems',
          label: '交叉轴对齐',
          defaultValue: 'center',
          options: [
            { value: 'start', label: '起点' },
            { value: 'center', label: '居中' },
            { value: 'end', label: '终点' },
            { value: 'stretch', label: '拉伸' },
          ],
        },
        { kind: 'range', id: 'basis', label: '基础尺寸', defaultValue: 92, min: 52, max: 150, step: 2 },
        { kind: 'range', id: 'grow', label: 'A 的伸展系数', defaultValue: 1, min: 0, max: 4, step: 1 },
        { kind: 'range', id: 'shrink', label: 'B 的收缩系数', defaultValue: 1, min: 0, max: 4, step: 1 },
      ],
    },
  ],
});

/** 当前 FlexLayout playground 的稳定文档契约 */
export const previewControlContract = {
  controls: flexLayoutPlaygroundControls,
  canonicalValues: {
    inspect: true,
    direction: 'row',
    wrap: 'wrap',
    alignItems: 'center',
    basis: 92,
    grow: 1,
    shrink: 1,
  },
  relatedApis: [
    'FlexLayout.inspect',
    'FlexLayout.direction',
    'FlexLayout.wrap',
    'FlexLayout.alignItems',
    'LayoutItem.basis',
    'LayoutItem.grow',
    'LayoutItem.shrink',
  ],
} satisfies PreviewControlContract;
