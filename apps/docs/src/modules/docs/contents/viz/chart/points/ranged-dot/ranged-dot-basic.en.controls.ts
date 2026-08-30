import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { RANGED_DOT_CONTROL_IDS } from './ranged-dot-basic.controls';
import { rangedDotData } from './ranged-dot-basic.data';

export const rangedDotBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Range and endpoints',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'World Bank country comparison',
          rows: rangedDotData,
          columns: [
            { key: 'country', label: 'Country' },
            { key: 'forestArea2000', label: '2000 (%)' },
            { key: 'forestArea2022', label: '2022 (%)' },
          ],
        },
      ],
    },
    {
      label: 'Connector',
      controls: [
        {
          kind: 'select',
          id: RANGED_DOT_CONTROL_IDS.lineStyle,
          label: 'Line style',
          defaultValue: 'solid',
          options: [
            { value: 'solid', label: 'Solid' },
            { value: 'dashed', label: 'Dashed' },
          ],
        },
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
    {
      label: 'Endpoints',
      controls: [
        {
          kind: 'range',
          id: RANGED_DOT_CONTROL_IDS.pointSize,
          label: 'Radius',
          defaultValue: 5,
          min: 2,
          max: 10,
          step: 1,
        },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.startColor, label: 'Start color', defaultValue: '#64748b' },
        { kind: 'color', id: RANGED_DOT_CONTROL_IDS.endColor, label: 'End color', defaultValue: '#2563eb' },
      ],
    },
  ],
});

export const previewControlContract = {
  controls: rangedDotBasicControls,
  canonicalValues: {
    [RANGED_DOT_CONTROL_IDS.lineStyle]: 'solid',
    [RANGED_DOT_CONTROL_IDS.strokeWidth]: 2,
    [RANGED_DOT_CONTROL_IDS.pointSize]: 5,
    [RANGED_DOT_CONTROL_IDS.startColor]: '#64748b',
    [RANGED_DOT_CONTROL_IDS.endColor]: '#2563eb',
  },
  relatedApis: [
    'RangedDotProperties.range',
    'RangedDotProperties.point',
    'RangedDotProperties.startPoint',
    'RangedDotProperties.endPoint',
  ],
} satisfies PreviewControlContract;
