import { PathCurve } from '@retikz/plot';

import type { PreviewAction } from '@/components/shared/component-preview/_shared';

export const PATH_CURVE_ACTION_ID = 'path-curve';

export const lineCurveActions = [
  {
    type: 'select',
    id: PATH_CURVE_ACTION_ID,
    label: '连接方式',
    value: PathCurve.Linear,
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
] satisfies Array<PreviewAction>;
