import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPlotTransformTableViews } from '../../transform-table-views';
import { relateOperationOf } from './transform-relate.controls';
import { monthlyTrend } from './transform-relate.data';

/** 行配对示例的英文控件 */
export const relateControls = definePreviewControls({
  presentation: 'panel',
  title: 'Endpoint pairing',
  sections: [
    {
      label: 'Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Monthly trend',
          views: createPlotTransformTableViews(
            { source: 'Source', result: 'Paired endpoints' },
            monthlyTrend,
            relateOperationOf,
          ),
          columns: [
            { key: 'series' },
            { key: 'id' },
            { key: 'month' },
            { key: 'value' },
            { key: 'sourceId' },
            { key: 'targetId' },
            { key: 'delta' },
            { key: 'deltaLabel' },
          ],
        },
      ],
    },
    {
      label: 'Endpoint selection',
      controls: [
        {
          kind: 'select',
          id: 'pairingScope',
          label: 'Pairing scope',
          defaultValue: 'series',
          options: [
            { value: 'series', label: 'Each series' },
            { value: 'all', label: 'All rows' },
          ],
        },
        {
          kind: 'select',
          id: 'sourceSelector',
          label: 'Source row',
          defaultValue: 'first',
          options: [
            { value: 'first', label: 'First row' },
            { value: 'last', label: 'Last row' },
            { value: 'min', label: 'Lowest value' },
            { value: 'max', label: 'Highest value' },
          ],
        },
        {
          kind: 'select',
          id: 'targetSelector',
          label: 'Target row',
          defaultValue: 'last',
          options: [
            { value: 'first', label: 'First row' },
            { value: 'last', label: 'Last row' },
            { value: 'min', label: 'Lowest value' },
            { value: 'max', label: 'Highest value' },
          ],
        },
      ],
    },
  ],
});

/** 行配对示例的英文稳定文档契约 */
export const previewControlContract = {
  controls: relateControls,
  canonicalValues: {
    pairingScope: 'series',
    sourceSelector: 'first',
    targetSelector: 'last',
  },
  presets: [
    {
      id: 'timeline',
      label: 'Series endpoints',
      values: {
        pairingScope: 'series',
        sourceSelector: 'first',
        targetSelector: 'last',
      },
    },
    {
      id: 'extrema',
      label: 'Lowest to highest',
      values: {
        pairingScope: 'series',
        sourceSelector: 'min',
        targetSelector: 'max',
      },
    },
    {
      id: 'reverse',
      label: 'Highest to lowest',
      values: {
        pairingScope: 'series',
        sourceSelector: 'max',
        targetSelector: 'min',
      },
    },
    {
      id: 'global',
      label: 'Global endpoints',
      values: {
        pairingScope: 'all',
        sourceSelector: 'first',
        targetSelector: 'last',
      },
    },
  ],
  relatedApis: [
    'IRPlotRelateTransform.groupBy',
    'IRPlotRelateTransform.source',
    'IRPlotRelateTransform.target',
    'IRPlotRelateTransform.measures',
  ],
} satisfies PreviewControlContract;
