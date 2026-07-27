import { PathCurve } from '@retikz/plot';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PATH_CURVE_CONTROL_ID, PATH_CURVE_SHOW_POINTS_ID } from './line-curve.controls';
import { curveSamples } from './line-curve.data';

/** 路径连接方式的英文属性面板 */
export const lineCurveControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path connection',
  sections: [
    {
      label: 'Data',
      controls: [{ kind: 'table', id: 'curveSamples', label: 'Curve samples', rows: curveSamples }],
    },
    {
      label: 'Connection',
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
        {
          kind: 'switch',
          id: PATH_CURVE_SHOW_POINTS_ID,
          label: 'Show data points',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 路径连接方式 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: lineCurveControls,
  canonicalValues: {
    [PATH_CURVE_CONTROL_ID]: PathCurve.Linear,
    [PATH_CURVE_SHOW_POINTS_ID]: true,
  },
  presets: [
    {
      id: 'linear',
      label: 'Linear',
      values: { [PATH_CURVE_CONTROL_ID]: PathCurve.Linear, [PATH_CURVE_SHOW_POINTS_ID]: true },
    },
    {
      id: 'smooth',
      label: 'Catmull-Rom',
      values: { [PATH_CURVE_CONTROL_ID]: PathCurve.CatmullRom, [PATH_CURVE_SHOW_POINTS_ID]: true },
    },
  ],
  relatedApis: ['PathMark.curve'],
} satisfies PreviewControlContract;
