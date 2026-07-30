import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { waterfallOperationOf } from './waterfall.controls';
import { waterfallRows } from './waterfall.data';
import { waterfallTransform } from './waterfall.definition';

/** Stable control ids for the custom waterfall-transform playground */
export const CUSTOM_TRANSFORM_CONTROL_IDS = {
  initialValue: 'custom-transform-initial-value',
} as const;

/** English panel for the custom waterfall transform */
export const waterfallControls = definePreviewControls({
  presentation: 'panel',
  title: 'Custom transform',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'custom-transform-waterfall-rows',
          label: 'Quarterly changes',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Waterfall result' },
            waterfallRows,
            waterfallOperationOf,
            { transformDefinitions: [waterfallTransform] },
          ),
          columns: [
            { key: 'period', label: 'Quarter' },
            { key: 'delta', label: 'Change' },
            { key: 'from', label: 'Start value' },
            { key: 'to', label: 'End value' },
            { key: 'direction', label: 'Direction' },
          ],
        },
      ],
    },
    {
      label: 'waterfall config',
      controls: [
        {
          kind: 'range',
          id: CUSTOM_TRANSFORM_CONTROL_IDS.initialValue,
          label: 'Initial value',
          defaultValue: 60,
          min: 0,
          max: 100,
          step: 10,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the custom waterfall transform */
export const previewControlContract = {
  controls: waterfallControls,
  canonicalValues: { [CUSTOM_TRANSFORM_CONTROL_IDS.initialValue]: 60 },
  relatedApis: ['Transform'],
} satisfies PreviewControlContract;
