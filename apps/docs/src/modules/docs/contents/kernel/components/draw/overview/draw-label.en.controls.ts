import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Draw label playground controls in English */
export const drawLabelEnControls = definePreviewControls({
  presentation: 'panel',
  title: 'Draw edge label',
  sections: [
    {
      label: 'Segment and position',
      controls: [
        {
          kind: 'select',
          id: 'segmentKind',
          label: 'Segment kind',
          defaultValue: 'line',
          options: [
            { value: 'line', label: 'Line' },
            { value: '-|', label: 'Horizontal then vertical' },
            { value: '|-', label: 'Vertical then horizontal' },
          ],
        },
        {
          kind: 'range',
          id: 'position',
          label: 'position',
          defaultValue: 0.5,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'select',
          id: 'side',
          label: 'side',
          defaultValue: 'top',
          options: [
            { value: 'top', label: 'Top' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'left', label: 'Left' },
            { value: 'right', label: 'Right' },
          ],
        },
      ],
    },
    {
      label: 'Text',
      controls: [
        { kind: 'switch', id: 'sloped', label: 'Rotate along path', defaultValue: false },
        { kind: 'color', id: 'textColor', label: 'Text color', defaultValue: '#6b7280' },
      ],
    },
  ],
});

/** Stable documentation contract for the current controls */
export const previewControlContract = {
  controls: drawLabelEnControls,
  canonicalValues: { segmentKind: 'line', position: 0.5, side: 'top', sloped: false, textColor: '#6b7280' },
  relatedApis: ['Draw.label'],
} satisfies PreviewControlContract;
