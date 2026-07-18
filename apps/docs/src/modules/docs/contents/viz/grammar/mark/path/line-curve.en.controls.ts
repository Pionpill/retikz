import { PathCurve } from '@retikz/plot';

import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

import { PATH_CURVE_CONTROL_ID } from './line-curve.controls';

export const lineCurveControls = definePreviewControls({
  presentation: 'overlay',
  controls: [
    {
      kind: 'select',
      id: PATH_CURVE_CONTROL_ID,
      label: 'Connection',
      defaultValue: PathCurve.Linear,
      options: [
        { value: PathCurve.Linear, label: 'Linear' },
        { value: PathCurve.Step, label: 'Step' },
        { value: PathCurve.StepBefore, label: 'Step before' },
        { value: PathCurve.StepAfter, label: 'Step after' },
        { value: PathCurve.Basis, label: 'Basis' },
        { value: PathCurve.Cardinal, label: 'Cardinal' },
        { value: PathCurve.CatmullRom, label: 'Catmull-Rom' },
        { value: PathCurve.MonotoneX, label: 'Monotone X' },
        { value: PathCurve.MonotoneY, label: 'Monotone Y' },
        { value: PathCurve.Natural, label: 'Natural' },
      ],
    },
  ],
});
