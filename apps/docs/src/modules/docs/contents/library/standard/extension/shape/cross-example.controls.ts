import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Cross 示例使用的稳定字段 id */
export const CrossExampleControlId = {
  HorizontalWidth: 'horizontalWidth',
  VerticalWidth: 'verticalWidth',
  TopHeight: 'topHeight',
  RightHeight: 'rightHeight',
  BottomHeight: 'bottomHeight',
  LeftHeight: 'leftHeight',
  Fill: 'fill',
} as const;

/** Cross 示例的中文属性面板 */
export const crossExampleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Cross',
  sections: [
    {
      label: '外观',
      controls: [
        {
          kind: 'range',
          id: CrossExampleControlId.HorizontalWidth,
          label: '水平臂宽度',
          defaultValue: 14,
          min: 6,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.VerticalWidth,
          label: '垂直臂宽度',
          defaultValue: 14,
          min: 6,
          max: 28,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.TopHeight,
          label: '上方高度',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.RightHeight,
          label: '右方高度',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.BottomHeight,
          label: '下方高度',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        {
          kind: 'range',
          id: CrossExampleControlId.LeftHeight,
          label: '左方高度',
          defaultValue: 48,
          min: 24,
          max: 72,
          step: 2,
        },
        { kind: 'color', id: CrossExampleControlId.Fill, label: '填充色', defaultValue: '#ffedd5' },
      ],
    },
  ],
});

/** Cross 示例的稳定文档契约 */
export const previewControlContract = {
  controls: crossExampleControls,
  canonicalValues: {
    horizontalWidth: 14,
    verticalWidth: 14,
    topHeight: 48,
    rightHeight: 48,
    bottomHeight: 48,
    leftHeight: 48,
    fill: '#ffedd5',
  },
  relatedApis: ['Layout.shapes', 'Node.shape'],
} satisfies PreviewControlContract;
