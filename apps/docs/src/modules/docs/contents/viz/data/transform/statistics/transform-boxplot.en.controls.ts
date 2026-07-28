import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createTransformResultView } from '../transform-table-views';
import { boxplotSamples } from './transform-boxplot.data';
import { boxOutlierOperationOf, boxSummaryOperationOf } from './transform-boxplot-preview';

/** English controls for the boxplot statistics composition */
export const transformBoxplotControls = definePreviewControls({
  presentation: 'panel',
  title: 'Quantile Band And Whiskers',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Grouped samples',
          views: [
            { id: 'source', label: 'Source', rows: boxplotSamples },
            createTransformResultView('summary-result', 'Box summary', boxplotSamples, boxSummaryOperationOf),
            createTransformResultView('outlier-result', 'Outliers', boxplotSamples, boxOutlierOperationOf),
          ],
        },
      ],
    },
    {
      label: 'Quantile Band',
      controls: [
        {
          kind: 'range',
          id: 'lowerP',
          label: 'Lower probability',
          defaultValue: 0.25,
          min: 0.05,
          max: 0.45,
          step: 0.05,
        },
        {
          kind: 'range',
          id: 'upperP',
          label: 'Upper probability',
          defaultValue: 0.75,
          min: 0.55,
          max: 0.95,
          step: 0.05,
        },
        { kind: 'range', id: 'factor', label: 'Whisker factor', defaultValue: 1.5, min: 0.5, max: 3, step: 0.25 },
      ],
    },
  ],
});

/** Stable documentation contract for the boxplot statistics composition */
export const previewControlContract = {
  controls: transformBoxplotControls,
  canonicalValues: { lowerP: 0.25, upperP: 0.75, factor: 1.5 },
  presets: [
    { id: 'standard', label: 'Standard IQR', values: { lowerP: 0.25, upperP: 0.75, factor: 1.5 } },
    { id: 'central-80', label: 'Central 80%', values: { lowerP: 0.1, upperP: 0.9, factor: 1.5 } },
    { id: 'tight-whisker', label: 'Tight whiskers', values: { lowerP: 0.25, upperP: 0.75, factor: 0.75 } },
  ],
  relatedApis: [
    'IRDataQuantileBandReducerOperation.lowerP',
    'IRDataQuantileBandReducerOperation.upperP',
    'IRDataOutsideQuantileBandSelectorOperation.boundary',
  ],
} satisfies PreviewControlContract;
