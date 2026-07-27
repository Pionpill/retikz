import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { discretizationValues } from './scale-discretization.data';

/** English panel for the discretized color scale playground */
export const scaleDiscretizationControls = definePreviewControls({
  presentation: 'panel',
  title: 'Discretized color scales',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'values',
          label: 'Skewed continuous values',
          rows: discretizationValues,
          columns: [
            { key: 'x', label: 'X' },
            { key: 'y', label: 'Y' },
            { key: 'value', label: 'Value' },
          ],
        },
      ],
    },
    {
      label: 'Bin rules',
      controls: [
        {
          kind: 'select',
          id: 'scaleType',
          label: 'Scale type',
          defaultValue: 'quantize',
          options: [
            { value: 'quantize', label: 'Equal-width quantize' },
            { value: 'threshold', label: 'Business threshold' },
            { value: 'quantile', label: 'Equal-frequency quantile' },
          ],
        },
        {
          kind: 'range',
          id: 'count',
          label: 'Color bins',
          defaultValue: 4,
          min: 3,
          max: 7,
          step: 1,
          visibleWhen: { controlId: 'scaleType', oneOf: ['quantize', 'quantile'] },
        },
        {
          kind: 'select',
          id: 'thresholdPreset',
          label: 'Business thresholds',
          defaultValue: 'risk',
          options: [
            { value: 'risk', label: 'Risk levels 10 / 30 / 60' },
            { value: 'service', label: 'Service levels 20 / 50 / 80' },
          ],
          visibleWhen: { controlId: 'scaleType', oneOf: ['threshold'] },
        },
        {
          kind: 'select',
          id: 'scheme',
          label: 'Bin palette',
          defaultValue: 'blues',
          options: [
            { value: 'blues', label: 'Blues' },
            { value: 'greens', label: 'Greens' },
            { value: 'magma', label: 'Magma' },
          ],
        },
      ],
    },
  ],
});

/** Stable contract for the discretized color scale playground */
export const previewControlContract = {
  controls: scaleDiscretizationControls,
  canonicalValues: {
    scaleType: 'quantize',
    count: 4,
    thresholdPreset: 'risk',
    scheme: 'blues',
  },
  presets: [
    {
      id: 'quantize',
      label: 'Four equal-width bins',
      values: {
        scaleType: 'quantize',
        count: 4,
        thresholdPreset: 'risk',
        scheme: 'blues',
      },
    },
    {
      id: 'threshold',
      label: 'Business thresholds',
      values: {
        scaleType: 'threshold',
        count: 4,
        thresholdPreset: 'risk',
        scheme: 'blues',
      },
    },
    {
      id: 'quantile',
      label: 'Four equal-frequency bins',
      values: {
        scaleType: 'quantile',
        count: 4,
        thresholdPreset: 'risk',
        scheme: 'blues',
      },
    },
  ],
  relatedApis: ['IRPlotQuantizeColorScale', 'IRPlotThresholdColorScale', 'IRPlotQuantileColorScale'],
} satisfies PreviewControlContract;
