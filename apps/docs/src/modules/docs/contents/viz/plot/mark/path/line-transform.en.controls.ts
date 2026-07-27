import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { weeklyPipeline } from './line-transform.data';

/** Stable control id for the path-layer trend grouping playground */
export const LINE_TRANSFORM_GROUPING_ID = 'line-transform-grouping';

/** English panel for the path-layer transform */
export const lineTransformControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path-layer trend',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'weeklyPipeline', label: 'Weekly pipeline', rows: weeklyPipeline }],
    },
    {
      label: 'Fit',
      controls: [
        {
          kind: 'select',
          id: LINE_TRANSFORM_GROUPING_ID,
          label: 'Fit mode',
          defaultValue: 'overall',
          options: [
            { value: 'overall', label: 'Overall trend' },
            { value: 'channel', label: 'Fit by channel' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the smooth transform */
export const previewControlContract = {
  controls: lineTransformControls,
  canonicalValues: { [LINE_TRANSFORM_GROUPING_ID]: 'overall' },
  relatedApis: ['PathMark.transform', 'IRPlotSmoothTransform.groupBy', 'PathMark.series'],
} satisfies PreviewControlContract;
