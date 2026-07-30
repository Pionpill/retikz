import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { LINE_INTERRUPTION_CONTROL_IDS } from './line-interruption.controls';
import { interruptedArea } from './line-interruption.data';

/** Stable control id for missing-value connections */
export const LINE_INTERRUPTION_CONNECT_NULLS_ID = 'line-interruption-connect-nulls';

/** English panel for missing-value connections */
export const lineInterruptionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Missing values',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'interruptedArea', label: 'Series with missing values', rows: interruptedArea }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: LINE_INTERRUPTION_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONTROL_IDS.closed,
          label: 'Close path',
          defaultValue: false,
          visibleWhen: { controlId: LINE_INTERRUPTION_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: 'Connection',
      controls: [
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONNECT_NULLS_ID,
          label: 'Connect across nulls',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: LINE_INTERRUPTION_CONTROL_IDS.showFill,
          label: 'Show area fill',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** Stable documentation contract for missing-value connections */
export const previewControlContract = {
  controls: lineInterruptionControls,
  canonicalValues: {
    [LINE_INTERRUPTION_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_INTERRUPTION_CONTROL_IDS.closed]: false,
    [LINE_INTERRUPTION_CONNECT_NULLS_ID]: false,
    [LINE_INTERRUPTION_CONTROL_IDS.showFill]: true,
  },
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.connectNulls',
    'PathMark.closure',
    'PathMark.fill',
    'PathMark.order',
  ],
} satisfies PreviewControlContract;
