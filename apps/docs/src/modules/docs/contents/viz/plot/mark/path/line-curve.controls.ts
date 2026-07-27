import { PathCurve } from '@retikz/plot';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { curveSamples } from './line-curve.data';

/** 路径连接方式 playground 的稳定控件 id */
export const PATH_CURVE_CONTROL_ID = 'path-curve';

/** 显示原始数据点的稳定控件 id */
export const PATH_CURVE_SHOW_POINTS_ID = 'path-curve-show-points';

/** 路径连接方式的中文属性面板 */
export const lineCurveControls = definePreviewControls({
  presentation: 'panel',
  title: '路径连接',
  sections: [
    {
      label: '数据',
      controls: [{ kind: 'table', id: 'curveSamples', label: '曲线样本', rows: curveSamples }],
    },
    {
      label: '连接',
      controls: [
        {
          kind: 'select',
          id: PATH_CURVE_CONTROL_ID,
          label: '连接方式',
          defaultValue: PathCurve.Linear,
          options: [
            { value: PathCurve.Linear, label: '直线' },
            { value: PathCurve.Step, label: '阶梯' },
            { value: PathCurve.StepBefore, label: '前置阶梯' },
            { value: PathCurve.StepAfter, label: '后置阶梯' },
            { value: PathCurve.Basis, label: '平滑样条' },
            { value: PathCurve.Cardinal, label: '基数样条' },
            { value: PathCurve.CatmullRom, label: '穿点平滑' },
            { value: PathCurve.MonotoneX, label: '横向单调' },
            { value: PathCurve.MonotoneY, label: '纵向单调' },
            { value: PathCurve.Natural, label: '自然样条' },
          ],
        },
        {
          kind: 'switch',
          id: PATH_CURVE_SHOW_POINTS_ID,
          label: '显示数据点',
          defaultValue: true,
        },
      ],
    },
  ],
});

/** 路径连接方式 playground 的稳定文档契约 */
export const previewControlContract = {
  controls: lineCurveControls,
  canonicalValues: {
    [PATH_CURVE_CONTROL_ID]: PathCurve.Linear,
    [PATH_CURVE_SHOW_POINTS_ID]: true,
  },
  presets: [
    {
      id: 'linear',
      label: '直线',
      values: { [PATH_CURVE_CONTROL_ID]: PathCurve.Linear, [PATH_CURVE_SHOW_POINTS_ID]: true },
    },
    {
      id: 'smooth',
      label: '穿点平滑',
      values: { [PATH_CURVE_CONTROL_ID]: PathCurve.CatmullRom, [PATH_CURVE_SHOW_POINTS_ID]: true },
    },
  ],
  relatedApis: ['PathMark.curve'],
} satisfies PreviewControlContract;
