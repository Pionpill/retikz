import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Block 样式 playground 使用的稳定字段 id */
export const BlockStyleControlId = {
  BackgroundOpacity: 'backgroundOpacity',
  BorderWidth: 'borderWidth',
  CornerRadius: 'cornerRadius',
  Padding: 'padding',
} as const;

/** Block shell 的中文样式控制 */
export const blockStyleControls = definePreviewControls({
  presentation: 'panel',
  title: 'Block 样式',
  sections: [
    {
      label: '整体外框',
      controls: [
        {
          kind: 'range',
          id: BlockStyleControlId.BackgroundOpacity,
          label: '背景透明度',
          defaultValue: 0.04,
          min: 0,
          max: 1,
          step: 0.02,
        },
        {
          kind: 'range',
          id: BlockStyleControlId.BorderWidth,
          label: '边框宽度',
          defaultValue: 1,
          min: 0,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: BlockStyleControlId.CornerRadius,
          label: '圆角半径',
          defaultValue: 8,
          min: 0,
          max: 24,
          step: 2,
        },
        { kind: 'range', id: BlockStyleControlId.Padding, label: '内边距', defaultValue: 8, min: 0, max: 24, step: 2 },
      ],
    },
  ],
});

/** Block 样式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: blockStyleControls,
  canonicalValues: {
    backgroundOpacity: 0.04,
    borderWidth: 1,
    cornerRadius: 8,
    padding: 8,
  },
  relatedApis: ['Block.background', 'Block.border', 'Block.cornerRadius', 'Block.padding'],
} satisfies PreviewControlContract;
