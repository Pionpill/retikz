import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

export const NodeLabelStyleControlId = {
  TextColor: 'textColor',
  FontSize: 'fontSize',
  Opacity: 'opacity',
  Multiline: 'multiline',
} as const;

export const nodeLabelStyleControls = definePreviewControls({
  presentation: 'panel',
  title: '标签样式',
  sections: [
    {
      controls: [
        {
          kind: 'select',
          id: 'textAlign',
          label: '块内对齐',
          defaultValue: 'middle',
          options: [
            { value: 'start', label: '起点' },
            { value: 'middle', label: '居中' },
            { value: 'end', label: '终点' },
          ],
        },
        { kind: 'range', id: 'lineHeight', label: '行高', defaultValue: 20, min: 10, max: 40, step: 1 },
        { kind: 'range', id: 'maxTextWidth', label: '折行宽度', defaultValue: 100, min: 40, max: 180, step: 5 },
        { kind: 'switch', id: NodeLabelStyleControlId.Multiline, label: '多行文本', defaultValue: true },
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
    multiline: true,
    textAlign: 'middle',
    lineHeight: 20,
    maxTextWidth: 100,
  },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
