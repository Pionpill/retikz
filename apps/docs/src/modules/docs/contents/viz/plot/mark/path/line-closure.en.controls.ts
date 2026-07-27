import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { closureRadar, closureTrend } from './line-closure.data';

/** Stable control id for baseline closure */
export const LINE_CLOSURE_BASELINE_ID = 'line-closure-baseline';

/** Stable control id for area horizontal padding */
export const LINE_CLOSURE_HORIZONTAL_PADDING_ID = 'line-closure-horizontal-padding';

/** Stable control id for area vertical padding */
export const LINE_CLOSURE_VERTICAL_PADDING_ID = 'line-closure-vertical-padding';

/** English panel for baseline and cycle closure */
export const lineClosureControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path closure',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [
        { kind: 'table', id: 'closureTrend', label: 'Trend area', rows: closureTrend },
        { kind: 'table', id: 'closureRadar', label: 'Radar area', rows: closureRadar },
      ],
    },
    {
      label: 'Baseline',
      controls: [
        {
          kind: 'range',
          id: LINE_CLOSURE_BASELINE_ID,
          label: 'Baseline value',
          defaultValue: 30,
          min: 0,
          max: 50,
          step: 5,
        },
      ],
    },
    {
      label: 'Area scales',
      controls: [
        {
          kind: 'range',
          id: LINE_CLOSURE_HORIZONTAL_PADDING_ID,
          label: 'Horizontal padding',
          defaultValue: 0,
          min: 0,
          max: 1,
          step: 0.05,
        },
        {
          kind: 'range',
          id: LINE_CLOSURE_VERTICAL_PADDING_ID,
          label: 'Vertical padding',
          defaultValue: 0,
          min: 0,
          max: 0.2,
          step: 0.01,
        },
      ],
    },
  ],
});

/** Stable documentation contract for baseline and cycle closure */
export const previewControlContract = {
  controls: lineClosureControls,
  canonicalValues: {
    [LINE_CLOSURE_BASELINE_ID]: 30,
    [LINE_CLOSURE_HORIZONTAL_PADDING_ID]: 0,
    [LINE_CLOSURE_VERTICAL_PADDING_ID]: 0,
  },
  relatedApis: ['PathMark.closure', 'PathMark.fill', 'Scale.padding', 'Scale.domainPadding'],
} satisfies PreviewControlContract;
