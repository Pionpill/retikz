import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

export const NodeLabelSpacingControlId = {
  Direction: 'direction',
  Placement: 'placement',
  Distance: 'distance',
} as const;

export const nodeLabelSpacingControls = definePreviewControls({
  presentation: 'panel',
  title: '间距与内外侧',
  sections: [
    {
      label: '摆放',
      controls: [
        {
          kind: 'select',
          id: NodeLabelSpacingControlId.Direction,
          label: '方位',
          defaultValue: 'right',
          options: [
            { value: 'top', label: '上' },
            { value: 'right', label: '右' },
            { value: 'bottom', label: '下' },
            { value: 'left', label: '左' },
          ],
        },
        {
          kind: 'select',
          id: NodeLabelSpacingControlId.Placement,
          label: '位置',
          defaultValue: 'outside',
          options: [
            { value: 'outside', label: '外侧' },
            { value: 'inside', label: '内侧' },
          ],
        },
        {
          kind: 'range',
          id: NodeLabelSpacingControlId.Distance,
          label: '视觉框净距',
          defaultValue: 12,
          min: 0,
          max: 60,
          step: 2,
        },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: nodeLabelSpacingControls,
  canonicalValues: { direction: 'right', placement: 'outside', distance: 12 },
  relatedApis: ['Node.label'],
} satisfies PreviewControlContract;
