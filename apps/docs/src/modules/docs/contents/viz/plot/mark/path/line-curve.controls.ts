import { PathCurve } from '@retikz/plot';

import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { curveSamples } from './line-curve.data';

/** 路径连接方式 playground 的稳定控件 id */
export const PATH_CURVE_CONTROL_ID = 'path-curve';

/** 显示原始数据点的稳定控件 id */
export const PATH_CURVE_SHOW_POINTS_ID = 'path-curve-show-points';

/** 路径连接与样式 playground 的其它稳定控件 id */
export const PATH_CURVE_CONTROL_IDS = {
  coordinate: 'path-curve-coordinate',
  closed: 'path-curve-closed',
  stroke: 'path-curve-stroke',
  strokeWidth: 'path-curve-stroke-width',
  dashed: 'path-curve-dashed',
  opacity: 'path-curve-opacity',
} as const;

/** 路径连接方式的中文属性面板 */
export const lineCurveControls = definePreviewControls({
  presentation: 'panel',
  title: '路径连接',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [{ kind: 'table', id: 'curveSamples', label: '曲线样本', rows: curveSamples }],
    },
    {
      label: '坐标系',
      controls: [
        {
          kind: 'select',
          id: PATH_CURVE_CONTROL_IDS.coordinate,
          label: '投影',
          defaultValue: 'cartesian2D',
          options: [
            { value: 'cartesian2D', label: '笛卡尔坐标' },
            { value: 'polar2D', label: '极坐标' },
          ],
        },
        {
          kind: 'switch',
          id: PATH_CURVE_CONTROL_IDS.closed,
          label: '是否闭合',
          defaultValue: false,
          visibleWhen: { controlId: PATH_CURVE_CONTROL_IDS.coordinate, oneOf: ['polar2D'] },
        },
      ],
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
    {
      label: '路径样式',
      controls: [
        {
          kind: 'color',
          id: PATH_CURVE_CONTROL_IDS.stroke,
          label: '描边色',
          defaultValue: '#0284c7',
        },
        {
          kind: 'range',
          id: PATH_CURVE_CONTROL_IDS.strokeWidth,
          label: '描边宽度',
          defaultValue: 3,
          min: 1,
          max: 8,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: PATH_CURVE_CONTROL_IDS.dashed,
          label: '虚线描边',
          defaultValue: false,
        },
        {
          kind: 'range',
          id: PATH_CURVE_CONTROL_IDS.opacity,
          label: '透明度',
          defaultValue: 0.9,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 路径连接方式 playground 的稳定文档契约 */
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
      label: '直线',
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
      label: '穿点平滑',
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
