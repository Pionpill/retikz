import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { oneDimensionalEvents } from './coordinate-1d-playground.data';

/** 一维坐标系试验场的稳定控件 id */
export const COORDINATE_1D_PLAYGROUND_CONTROL_IDS = {
  coordinate: 'coordinate',
  orientation: 'orientation',
  radius: 'radius',
  startAngle: 'startAngle',
  sweepAngle: 'sweepAngle',
  pointSize: 'pointSize',
  pointFill: 'pointFill',
  pointStroke: 'pointStroke',
  pointStrokeWidth: 'pointStrokeWidth',
  pointOpacity: 'pointOpacity',
  axisVisible: 'axisVisible',
  axisStroke: 'axisStroke',
  axisStrokeWidth: 'axisStrokeWidth',
} as const;

/** 一维坐标系试验场的中文控件 */
export const coordinate1DPlaygroundControls = definePreviewControls({
  presentation: 'panel',
  title: '一维坐标系',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '事件时刻',
          rows: oneDimensionalEvents,
          columns: [{ key: 'hour', label: '小时' }],
        },
      ],
    },
    {
      label: '坐标形态',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
          label: '投影形态',
          defaultValue: 'cartesian1D',
          options: [
            { value: 'cartesian1D', label: '直线' },
            { value: 'polar1D', label: '圆周' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation,
          label: '直线方向',
          defaultValue: 'horizontal',
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['cartesian1D'],
          },
          options: [
            { value: 'horizontal', label: '横向' },
            { value: 'vertical', label: '纵向' },
          ],
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius,
          label: '外半径占比',
          defaultValue: 1,
          min: 0.5,
          max: 1,
          step: 0.05,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['polar1D'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle,
          label: '起始角度',
          defaultValue: 0,
          min: -180,
          max: 180,
          step: 15,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['polar1D'],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle,
          label: '扫过角度',
          defaultValue: 360,
          min: 90,
          max: 360,
          step: 15,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate,
            oneOf: ['polar1D'],
          },
        },
      ],
    },
    {
      label: '事件点样式',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointSize,
          label: '点尺寸',
          defaultValue: 11,
          min: 5,
          max: 24,
          step: 1,
        },
        {
          kind: 'color',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointFill,
          label: '填充色',
          defaultValue: '#bfdbfe',
        },
        {
          kind: 'color',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStroke,
          label: '描边色',
          defaultValue: '#1d4ed8',
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStrokeWidth,
          label: '描边宽度',
          defaultValue: 1.5,
          min: 0,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointOpacity,
          label: '透明度',
          defaultValue: 1,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '轴线样式',
      controls: [
        {
          kind: 'switch',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible,
          label: '显示坐标轴',
          defaultValue: true,
        },
        {
          kind: 'color',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStroke,
          label: '轴线颜色',
          defaultValue: '#64748b',
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
        {
          kind: 'range',
          id: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStrokeWidth,
          label: '轴线宽度',
          defaultValue: 1,
          min: 0.5,
          max: 4,
          step: 0.5,
          visibleWhen: {
            controlId: COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

const canonicalStyleValues = {
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointSize]: 11,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointFill]: '#bfdbfe',
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStroke]: '#1d4ed8',
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStrokeWidth]: 1.5,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointOpacity]: 1,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible]: true,
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStroke]: '#64748b',
  [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStrokeWidth]: 1,
} as const;

/** 一维坐标系试验场的稳定文档契约 */
export const previewControlContract = {
  controls: coordinate1DPlaygroundControls,
  canonicalValues: {
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'cartesian1D',
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 0,
    [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 360,
    ...canonicalStyleValues,
  },
  presets: [
    {
      id: 'line',
      label: '横向直线',
      values: {
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'cartesian1D',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 0,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 360,
        ...canonicalStyleValues,
      },
    },
    {
      id: 'clock',
      label: '完整钟面',
      values: {
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'polar1D',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 0,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 360,
        ...canonicalStyleValues,
      },
    },
    {
      id: 'semicircle',
      label: '半圆区间',
      values: {
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate]: 'polar1D',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation]: 'horizontal',
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius]: 1,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle]: 180,
        [COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle]: 180,
        ...canonicalStyleValues,
      },
    },
  ],
  relatedApis: [
    'Plot.coordinate',
    'PointMark.size',
    'PointMark.fill',
    'PointMark.stroke',
    'PointMark.strokeWidth',
    'PointMark.opacity',
    'Axis.line',
  ],
} satisfies PreviewControlContract;
