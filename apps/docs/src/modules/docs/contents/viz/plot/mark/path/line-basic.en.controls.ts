import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { revenue } from './line-basic.data';

/** Stable control ids for the basic path field playground */
export const LINE_BASIC_CONTROL_IDS = {
  coordinate: 'path-basic-coordinate',
  closed: 'path-basic-closed',
  xField: 'line-basic-x-field',
  yField: 'line-basic-y-field',
  orderSource: 'line-basic-order-source',
} as const;

/** English panel for basic path fields */
export const lineBasicControls = definePreviewControls({
  presentation: 'panel',
  title: 'Position fields',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'revenue', label: 'Monthly revenue', rows: revenue }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_BASIC_CONTROL_IDS.closed,
          label: 'Close path',
          defaultValue: false,
          visibleWhen: { controlId: LINE_BASIC_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: 'Position channels',
      controls: [
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.xField,
          label: 'x field',
          defaultValue: 'coordinate',
          options: [
            { value: 'coordinate', label: 'By coordinate' },
            { value: 'month', label: 'month' },
            { value: 'period', label: 'period' },
          ],
        },
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.yField,
          label: 'y field',
          defaultValue: 'revenue',
          options: [
            { value: 'revenue', label: 'revenue' },
            { value: 'month', label: 'month' },
          ],
        },
        {
          kind: 'select',
          id: LINE_BASIC_CONTROL_IDS.orderSource,
          label: 'Connection order',
          defaultValue: 'field',
          options: [
            { value: 'field', label: 'Sort by month' },
            { value: 'data', label: 'Use data array order' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for basic path fields */
export const previewControlContract = {
  controls: lineBasicControls,
  canonicalValues: {
    [LINE_BASIC_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_BASIC_CONTROL_IDS.closed]: false,
    [LINE_BASIC_CONTROL_IDS.xField]: 'coordinate',
    [LINE_BASIC_CONTROL_IDS.yField]: 'revenue',
    [LINE_BASIC_CONTROL_IDS.orderSource]: 'field',
  },
  relatedApis: ['Plot.coordinate', 'PathMark.closed', 'PathMark.x', 'PathMark.y', 'PathMark.order'],
} satisfies PreviewControlContract;
