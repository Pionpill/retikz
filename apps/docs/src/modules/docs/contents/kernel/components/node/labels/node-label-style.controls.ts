import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

export const NodeLabelStyleControlId = {
  TextColor: 'textColor',
  FontSize: 'fontSize',
  Opacity: 'opacity',
} as const;

export const nodeLabelStyleControls = definePreviewControls({
  presentation: 'panel',
  title: '标签样式',
  sections: [
    {
      label: '文字',
      controls: [
        { kind: 'color', id: NodeLabelStyleControlId.TextColor, label: '文字颜色', defaultValue: '#2563eb' },
        {
          kind: 'range',
          id: NodeLabelStyleControlId.FontSize,
          label: '字号',
          defaultValue: 16,
          min: 10,
          max: 28,
          step: 1,
        },
        {
          kind: 'range',
          id: NodeLabelStyleControlId.Opacity,
          label: '透明度',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.1,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelStyleControls,
  canonicalValues: {
    textColor: '#2563eb',
    fontSize: 16,
    opacity: 1,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
