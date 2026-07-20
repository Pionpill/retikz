import type { PreviewControlContract } from '@/modules/docs/components/component-preview/author';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { CurvePlaygroundControlId } from './curve-playground.controls';

/** English controls for point sets and curve tension */
export const curvePlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: 'Curve through points',
  sections: [
    {
      label: 'Input',
      controls: [
        {
          kind: 'select',
          id: CurvePlaygroundControlId.PointSet,
          label: 'Point set',
          defaultValue: 'uneven',
          options: [
            { value: 'uneven', label: 'Uneven spacing' },
            { value: 'zigzag', label: 'Zigzag' },
            { value: 'coincident', label: 'Coincident point' },
          ],
        },
        {
          kind: 'range',
          id: CurvePlaygroundControlId.Tension,
          label: 'tension',
          defaultValue: 1,
          min: 0.2,
          max: 2,
          step: 0.1,
        },
      ],
    },
  ],
});

/** Stable state, presets, and API coverage for the English curve playground */
export const previewControlContract = {
  controls: curvePlaygroundControls,
  canonicalValues: { pointSet: 'uneven', tension: 1 },
  presets: [
    { id: 'uneven', label: 'Uneven spacing', values: { pointSet: 'uneven', tension: 1 } },
    { id: 'zigzag', label: 'Zigzag', values: { pointSet: 'zigzag', tension: 0.7 } },
    { id: 'coincident', label: 'Coincident point', values: { pointSet: 'coincident', tension: 1 } },
  ],
  relatedApis: ['curve.catmullRomToCubic', 'CubicSegment'],
} satisfies PreviewControlContract;
