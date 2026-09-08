import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Layout 输出边界面板使用的稳定字段 id */
export const LayoutViewBoxControlId = {
  ViewBoxX: 'viewBoxX',
  ViewBoxY: 'viewBoxY',
  ViewBoxWidth: 'viewBoxWidth',
  ViewBoxHeight: 'viewBoxHeight',
} as const;

/** Layout 输出边界的中文属性面板定义 */
export const layoutViewboxControls = definePreviewControls({
  presentation: 'panel',
  title: 'Layout 输出边界',
  sections: [
    {
      label: '内部视框',
      controls: [
        {
          kind: 'number',
          id: LayoutViewBoxControlId.ViewBoxX,
          label: '起点 x',
          defaultValue: -120,
          min: -240,
          max: 120,
          step: 10,
        },
        {
          kind: 'number',
          id: LayoutViewBoxControlId.ViewBoxY,
          label: '起点 y',
          defaultValue: -120,
          min: -240,
          max: 120,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.ViewBoxWidth,
          label: '视框宽度',
          defaultValue: 240,
          min: 80,
          max: 400,
          step: 10,
        },
        {
          kind: 'range',
          id: LayoutViewBoxControlId.ViewBoxHeight,
          label: '视框高度',
          defaultValue: 240,
          min: 80,
          max: 400,
          step: 10,
        },
      ],
    },
  ],
});

/** Layout 输出边界面板的稳定文档契约 */
export const previewControlContract = {
  controls: layoutViewboxControls,
  canonicalValues: {
    viewBoxX: -120,
    viewBoxY: -120,
    viewBoxWidth: 240,
    viewBoxHeight: 240,
  },
  relatedApis: ['Layout.viewBox'],
} satisfies PreviewControlContract;
