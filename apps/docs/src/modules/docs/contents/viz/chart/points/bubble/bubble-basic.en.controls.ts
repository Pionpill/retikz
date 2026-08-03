import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { BUBBLE_BASIC_CONTROL_IDS } from './bubble-basic.controls';
import { vehicleBubbleData } from './bubble-basic.data';

/** Bubble 的英文控制面板 */
export const bubbleBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Bubble chart',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Vehicle samples',
          rows: vehicleBubbleData,
          columns: [
            { key: 'model', label: 'Model' },
            { key: 'weight', label: 'Weight' },
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'power', label: 'Power' },
            { key: 'price', label: 'Price' },
            { key: 'group', label: 'Group' },
          ],
        },
      ],
    },
    {
      label: 'Bubble encoding',
      controls: [
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.sizeEncoding,
          label: 'Area field',
          defaultValue: 'power',
          options: [
            { value: 'power', label: 'Power' },
            { value: 'price', label: 'Price' },
          ],
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.colorByGroup,
          label: 'Color by group',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Bubble 的英文稳定文档契约 */
export const previewControlContract = {
  controls: bubbleBasicControls,
  canonicalValues: {
    [BUBBLE_BASIC_CONTROL_IDS.sizeEncoding]: 'power',
    [BUBBLE_BASIC_CONTROL_IDS.colorByGroup]: true,
  },
  relatedApis: ['PointMark.size', 'PointMark.color'],
} satisfies PreviewControlContract;
