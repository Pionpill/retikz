import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** OverlayLayout 局部定位的中文属性面板 */
export const overlayLayoutPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '叠加布局参数',
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
      label: '共享对齐',
      controls: [
        {
          kind: 'select',
          id: 'justifyItems',
          label: '水平对齐',
          defaultValue: 'center',
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
    {
      label: '徽标定位',
      controls: [
        { kind: 'range', id: 'badgeX', label: '目标 x', defaultValue: 300, min: 20, max: 320, step: 10 },
        { kind: 'range', id: 'badgeY', label: '目标 y', defaultValue: 18, min: 10, max: 130, step: 10 },
        {
          kind: 'select',
          id: 'anchor',
          label: '锚点',
          defaultValue: 'top-right',
          options: [
            { value: 'top-left', label: '左上' },
            { value: 'center', label: '中心' },
            { value: 'top-right', label: '右上' },
          ],
        },
        { kind: 'range', id: 'zIndex', label: '叠放层级', defaultValue: 2, min: -1, max: 3, step: 1 },
      ],
    },
  ],
});

/** 当前 OverlayLayout playground 的稳定文档契约 */
export const previewControlContract = {
  controls: overlayLayoutPlaygroundControls,
  canonicalValues: {
    inspect: true,
    justifyItems: 'center',
    alignItems: 'center',
    badgeX: 300,
    badgeY: 18,
    anchor: 'top-right',
    zIndex: 2,
  },
  relatedApis: [
    'OverlayLayout.inspect',
    'OverlayLayout.justifyItems',
    'OverlayLayout.alignItems',
    'LayoutItem.placement.at',
    'LayoutItem.placement.anchor',
    'LayoutItem.zIndex',
  ],
} satisfies PreviewControlContract;
