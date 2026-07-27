import { PathCurve } from '@retikz/plot';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { stackArea } from './line-stack-area.data';

/** Stable control id for stacked-area connections */
export const LINE_STACK_AREA_CURVE_ID = 'line-stack-area-curve';

/** English panel for stacked-area connections */
export const lineStackAreaControls = definePreviewControls({
  presentation: 'panel',
  title: 'Stacked area',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'stackArea', label: 'Stacked area', rows: stackArea }],
    },
    {
      label: 'Connection',
      controls: [
        {
          kind: 'select',
          id: LINE_STACK_AREA_CURVE_ID,
          label: 'Connection',
          defaultValue: PathCurve.Linear,
          options: [
            { value: PathCurve.Linear, label: 'Linear' },
            { value: PathCurve.Step, label: 'Step' },
            { value: PathCurve.CatmullRom, label: 'Catmull–Rom' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for stacked-area connections */
export const previewControlContract = {
  controls: lineStackAreaControls,
  canonicalValues: { [LINE_STACK_AREA_CURVE_ID]: PathCurve.Linear },
  relatedApis: ['PathMark.closure', 'PathMark.series', 'PathMark.curve'],
} satisfies PreviewControlContract;
