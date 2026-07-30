import { DEFAULT_TRANSFORM_CONTEXT, resolveRowSelectorRegistry, resolveStatisticsReducerRegistry } from '@retikz/data';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';
import { createTransformResultView } from '@/modules/docs/preview';

import { scoreRows } from './extension-statistics.data';
import {
  closestToMean,
  closestToMeanSelectOperationOf,
  midpoint,
  midpointSummaryOperationOf,
} from './extension-statistics-preview';

const reducerContext = {
  ...DEFAULT_TRANSFORM_CONTEXT,
  statisticsReducerRegistry: resolveStatisticsReducerRegistry([midpoint]),
};
const selectorContext = {
  ...DEFAULT_TRANSFORM_CONTEXT,
  rowSelectorRegistry: resolveRowSelectorRegistry([closestToMean]),
};

/** English controls for the custom statistical-sub-operator example */
export const extensionStatisticsControls = definePreviewControls({
  presentation: 'panel',
  title: 'Statistics Extension Input',
  sections: [
    {
      label: 'Input Data',
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'Grouped scores',
          views: [
            { id: 'source', label: 'Source', rows: scoreRows },
            createTransformResultView('reducer-result', 'Reducer output', scoreRows, midpointSummaryOperationOf, {
              context: reducerContext,
            }),
            createTransformResultView('selector-result', 'Selector output', scoreRows, closestToMeanSelectOperationOf, {
              context: selectorContext,
            }),
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the custom statistical-sub-operator example */
export const previewControlContract = {
  controls: extensionStatisticsControls,
  canonicalValues: {},
  relatedApis: ['defineStatisticsReducer', 'defineRowSelector'],
} satisfies PreviewControlContract;
