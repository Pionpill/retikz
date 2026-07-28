import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformTableViews } from '../transform-table-views';
import { cityRevenue } from './transform-select.data';
import { transformSelectOperationOf } from './transform-select-preview';

/** English controls for the representative-row example */
export const transformSelectControls = definePreviewControls({
  presentation: 'panel',
  title: 'Representative Rows',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'City revenue',
          views: createTransformTableViews(
            { source: 'Source', result: 'Result' },
            cityRevenue,
            transformSelectOperationOf,
          ),
        },
      ],
    },
    {
      label: 'Selection Rule',
      controls: [
        {
          kind: 'select',
          id: 'selectorKind',
          label: 'Kind',
          defaultValue: 'max',
          options: [
            { value: 'max', label: 'Maximum' },
            { value: 'min', label: 'Minimum' },
            { value: 'top', label: 'Top N' },
            { value: 'bottom', label: 'Bottom N' },
          ],
        },
        {
          kind: 'range',
          id: 'n',
          label: 'Rows',
          defaultValue: 1,
          min: 1,
          max: 3,
          step: 1,
          visibleWhen: { controlId: 'selectorKind', oneOf: ['top', 'bottom'] },
        },
        {
          kind: 'select',
          id: 'tie',
          label: 'Tie Handling',
          defaultValue: 'first',
          options: [
            { value: 'first', label: 'Keep first' },
            { value: 'last', label: 'Keep last' },
            { value: 'all', label: 'Keep all' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the representative-row example */
export const previewControlContract = {
  controls: transformSelectControls,
  canonicalValues: { selectorKind: 'max', n: 1, tie: 'first' },
  presets: [
    { id: 'max', label: 'Group maximum', values: { selectorKind: 'max', n: 1, tie: 'first' } },
    { id: 'min', label: 'Group minimum', values: { selectorKind: 'min', n: 1, tie: 'first' } },
    { id: 'top-two', label: 'Group Top 2', values: { selectorKind: 'top', n: 2, tie: 'all' } },
  ],
  relatedApis: ['IRDataSelectTransform.selector', 'IRDataSelectTransform.rankAs'],
} satisfies PreviewControlContract;
