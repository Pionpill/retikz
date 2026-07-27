import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { positionRows } from './builtin-position.data';

const positionFieldOptions = [
  { value: 'month', label: 'Month' },
  { value: 'sales', label: 'Sales' },
  { value: 'profit', label: 'Profit' },
  { value: 'orders', label: 'Orders' },
  { value: 'averageOrder', label: 'Average order value' },
] as const;

/** English control panel for the built-in position-channel playground */
export const builtinPositionControls = definePreviewControls({
  presentation: 'panel',
  title: 'Position channels',
  sections: [
    {
      label: 'Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Monthly operating data',
          rows: positionRows,
          columns: [
            { key: 'month', label: 'Month' },
            { key: 'sales', label: 'Sales' },
            { key: 'profit', label: 'Profit' },
            { key: 'orders', label: 'Orders' },
            { key: 'averageOrder', label: 'Average order value' },
          ],
        },
      ],
    },
    {
      label: 'Position channels',
      controls: [
        {
          kind: 'select',
          id: 'xField',
          label: 'X field (horizontal axis)',
          defaultValue: 'month',
          options: positionFieldOptions,
        },
        {
          kind: 'select',
          id: 'yField',
          label: 'Y field (vertical axis)',
          defaultValue: 'sales',
          options: positionFieldOptions,
        },
      ],
    },
  ],
});

/** Stable documentation contract for the built-in position-channel playground */
export const previewControlContract = {
  controls: builtinPositionControls,
  canonicalValues: {
    xField: 'month',
    yField: 'sales',
  },
  presets: [
    {
      id: 'sales-by-month',
      label: 'Sales by month',
      values: {
        xField: 'month',
        yField: 'sales',
      },
    },
    {
      id: 'profit-by-month',
      label: 'Profit by month',
      values: {
        xField: 'month',
        yField: 'profit',
      },
    },
    {
      id: 'sales-by-orders',
      label: 'Orders and sales',
      values: {
        xField: 'orders',
        yField: 'sales',
      },
    },
  ],
  relatedApis: ['PointMark.x', 'PointMark.y'],
} satisfies PreviewControlContract;
