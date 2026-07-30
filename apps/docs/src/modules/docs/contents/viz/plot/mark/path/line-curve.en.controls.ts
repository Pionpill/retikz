import { PathCurve } from '@retikz/plot';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { PATH_CURVE_CONTROL_ID, PATH_CURVE_CONTROL_IDS, PATH_CURVE_SHOW_POINTS_ID } from './line-curve.controls';
import { curveSamples } from './line-curve.data';

/** 路径连接方式的英文属性面板 */
export const lineCurveControls = definePreviewControls({
  presentation: 'panel',
  title: 'Path connection',
  sections: [
    {
      label: 'Data',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'curveSamples', label: 'Curve samples', rows: curveSamples }],
    },
    {
      label: 'Coordinate',
      controls: [
        {
          kind: 'select',
          id: PATH_CURVE_CONTROL_IDS.coordinate,
          label: 'Projection',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: 'Cartesian' },
            { value: 'polar2D', label: 'Polar' },
          ],
        },
        {
          kind: 'switch',
          id: PATH_CURVE_CONTROL_IDS.closed,
          label: 'Close path',
          defaultValue: false,
          visibleWhen: { controlId: PATH_CURVE_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
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
    {
      label: 'Path style',
      controls: [
        {
          kind: 'color',
          id: PATH_CURVE_CONTROL_IDS.stroke,
          label: 'Stroke',
          defaultValue: '#0284c7',
        },
        {
          kind: 'range',
          id: PATH_CURVE_CONTROL_IDS.strokeWidth,
          label: 'Stroke width',
          defaultValue: 3,
          min: 1,
          max: 8,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: PATH_CURVE_CONTROL_IDS.dashed,
          label: 'Dashed stroke',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: PATH_CURVE_CONTROL_IDS.opacity,
          label: 'Opacity',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 路径连接方式 playground 的英文稳定文档契约 */
export const previewControlContract = {
  controls: lineCurveControls,
  canonicalValues: {
    [PATH_CURVE_CONTROL_IDS.coordinate]: 'cartesian2D',
    [PATH_CURVE_CONTROL_IDS.closed]: false,
    [PATH_CURVE_CONTROL_ID]: PathCurve.Linear,
    [PATH_CURVE_SHOW_POINTS_ID]: true,
    [PATH_CURVE_CONTROL_IDS.stroke]: '#0284c7',
    [PATH_CURVE_CONTROL_IDS.strokeWidth]: 3,
    [PATH_CURVE_CONTROL_IDS.dashed]: false,
    [PATH_CURVE_CONTROL_IDS.opacity]: 0.9,
  },
  presets: [
    {
      id: 'linear',
      label: 'Linear',
      values: {
        [PATH_CURVE_CONTROL_IDS.coordinate]: 'cartesian2D',
        [PATH_CURVE_CONTROL_IDS.closed]: false,
        [PATH_CURVE_CONTROL_ID]: PathCurve.Linear,
        [PATH_CURVE_SHOW_POINTS_ID]: true,
        [PATH_CURVE_CONTROL_IDS.stroke]: '#0284c7',
        [PATH_CURVE_CONTROL_IDS.strokeWidth]: 3,
        [PATH_CURVE_CONTROL_IDS.dashed]: false,
        [PATH_CURVE_CONTROL_IDS.opacity]: 0.9,
      },
    },
    {
      id: 'smooth',
      label: 'Catmull-Rom',
      values: {
        [PATH_CURVE_CONTROL_IDS.coordinate]: 'cartesian2D',
        [PATH_CURVE_CONTROL_IDS.closed]: false,
        [PATH_CURVE_CONTROL_ID]: PathCurve.CatmullRom,
        [PATH_CURVE_SHOW_POINTS_ID]: true,
        [PATH_CURVE_CONTROL_IDS.stroke]: '#7c3aed',
        [PATH_CURVE_CONTROL_IDS.strokeWidth]: 4,
        [PATH_CURVE_CONTROL_IDS.dashed]: false,
        [PATH_CURVE_CONTROL_IDS.opacity]: 0.9,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'PathMark.closed',
    'PathMark.curve',
    'PathMark.stroke',
    'PathMark.strokeWidth',
    'PathMark.dashPattern',
    'PathMark.opacity',
  ],
} satisfies PreviewControlContract;
