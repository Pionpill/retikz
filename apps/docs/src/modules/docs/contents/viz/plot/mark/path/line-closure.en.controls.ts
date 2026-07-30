import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { LINE_CLOSURE_CONTROL_IDS } from './line-closure.controls';
import { closureTrend } from './line-closure.data';

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
      controls: [{ kind: 'table', id: 'closureTrend', label: 'Trend area', rows: closureTrend }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: LINE_CLOSURE_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
        {
          kind: 'switch',
          id: LINE_CLOSURE_CONTROL_IDS.closed,
          label: 'Close path',
          defaultValue: false,
          visibleWhen: { controlId: LINE_CLOSURE_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
    },
    {
      label: 'Closure and fill',
      controls: [
        {
          kind: 'select',
          id: LINE_CLOSURE_CONTROL_IDS.mode,
          label: 'Closure mode',
          defaultValue: 'open',
          options: [
            { value: 'open', label: 'Open path' },
            { value: 'cycle', label: 'Close end to start' },
            { value: 'baseline', label: 'Return to baseline' },
          ],
        },
        {
          kind: 'range',
          id: LINE_CLOSURE_BASELINE_ID,
          label: 'Baseline value',
          defaultValue: 30,
          min: 0,
          max: 50,
          step: 5,
          visibleWhen: { controlId: LINE_CLOSURE_CONTROL_IDS.mode, oneOf: ['baseline'] },
        },
        {
          kind: 'range',
          id: LINE_CLOSURE_CONTROL_IDS.fillOpacity,
          label: 'Fill opacity',
          defaultValue: 0.24,
          min: 0.1,
          max: 0.7,
          step: 0.05,
          visibleWhen: { controlId: LINE_CLOSURE_CONTROL_IDS.mode, oneOf: ['cycle', 'baseline'] },
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
    [LINE_CLOSURE_CONTROL_IDS.coordinate]: 'cartesian2D',
    [LINE_CLOSURE_CONTROL_IDS.closed]: false,
    [LINE_CLOSURE_CONTROL_IDS.mode]: 'open',
    [LINE_CLOSURE_BASELINE_ID]: 30,
    [LINE_CLOSURE_CONTROL_IDS.fillOpacity]: 0.24,
    [LINE_CLOSURE_HORIZONTAL_PADDING_ID]: 0,
    [LINE_CLOSURE_VERTICAL_PADDING_ID]: 0,
  },
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.closure',
    'PathMark.fill',
    'Scale.padding',
    'Scale.domainPadding',
  ],
} satisfies PreviewControlContract;
