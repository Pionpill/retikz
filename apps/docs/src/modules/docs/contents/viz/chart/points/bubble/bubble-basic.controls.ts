import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { createPointCoordinateControl } from '../point-coordinate-control';
import { GAPMINDER_BUBBLE_YEAR, gapminderBubbleData } from './bubble-basic.data';

/** 基础 Bubble playground 的稳定控件 id */
export const BUBBLE_BASIC_CONTROL_IDS = {
  coordinateSystem: 'bubble-basic-coordinate-system',
  colorByContinent: 'bubble-basic-color-by-continent',
  xScale: 'bubble-basic-x-scale',
  xTickCount: 'bubble-basic-x-tick-count',
  xTickMarks: 'bubble-basic-x-tick-marks',
  xTickLabels: 'bubble-basic-x-tick-labels',
  xGrid: 'bubble-basic-x-grid',
  pointStrokeEnabled: 'bubble-basic-point-stroke-enabled',
  pointStroke: 'bubble-basic-point-stroke',
  pointShape: 'bubble-basic-point-shape',
  pointFillOpacity: 'bubble-basic-point-fill-opacity',
} as const;

/** 基础 Bubble 的中文控制面板 */
export const bubbleBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '基础气泡图',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: `${GAPMINDER_BUBBLE_YEAR} 年国家截面`,
          rows: gapminderBubbleData,
          columns: [
            { key: 'country', label: '国家或地区' },
            { key: 'continent', label: '洲' },
            { key: 'gdpPerCapita', label: '人均 GDP' },
            { key: 'lifeExpectancy', label: '预期寿命' },
            { key: 'population', label: '人口' },
          ],
        },
      ],
    },
    {
      label: '坐标',
      controls: [
        createPointCoordinateControl({
          id: BUBBLE_BASIC_CONTROL_IDS.coordinateSystem,
          label: '坐标系',
          cartesianLabel: '笛卡尔',
          polarLabel: '极坐标',
        }),
      ],
    },
    {
      label: '编码',
      controls: [
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.colorByContinent,
          label: '按洲分类着色',
          defaultValue: true,
        },
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.xScale,
          label: 'X 轴尺度',
          defaultValue: 'log',
          options: [
            { value: 'log', label: '对数' },
            { value: 'linear', label: '线性' },
          ],
        },
      ],
    },
    {
      label: 'X 轴',
      controls: [
        {
          kind: 'range',
          id: BUBBLE_BASIC_CONTROL_IDS.xTickCount,
          label: '目标刻度数',
          defaultValue: 10,
          min: 5,
          max: 20,
          step: 1,
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.xTickMarks,
          label: '显示刻度线',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.xTickLabels,
          label: '显示刻度标签',
          defaultValue: true,
        },
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.xGrid,
          label: '显示网格线',
          defaultValue: true,
        },
      ],
    },
    {
      label: '气泡',
      controls: [
        {
          kind: 'switch',
          id: BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled,
          label: '描边',
          defaultValue: false,
        },
        {
          kind: 'color',
          id: BUBBLE_BASIC_CONTROL_IDS.pointStroke,
          label: '描边色',
          defaultValue: 'currentColor',
          visibleWhen: { controlId: BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled, oneOf: [true] },
        },
        {
          kind: 'select',
          id: BUBBLE_BASIC_CONTROL_IDS.pointShape,
          label: '形状',
          defaultValue: 'circle',
          options: [
            { value: 'circle', label: '圆形' },
            { value: 'rectangle', label: '矩形' },
            { value: 'diamond', label: '菱形' },
          ],
        },
        {
          kind: 'range',
          id: BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity,
          label: '填充不透明度',
          defaultValue: 0.7,
          min: 0.3,
          max: 1,
          step: 0.05,
        },
      ],
    },
  ],
});

/** 基础 Bubble 的稳定文档契约 */
export const previewControlContract = {
  controls: bubbleBasicControls,
  canonicalValues: {
    [BUBBLE_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
    [BUBBLE_BASIC_CONTROL_IDS.colorByContinent]: true,
    [BUBBLE_BASIC_CONTROL_IDS.xScale]: 'log',
    [BUBBLE_BASIC_CONTROL_IDS.xTickCount]: 10,
    [BUBBLE_BASIC_CONTROL_IDS.xTickMarks]: true,
    [BUBBLE_BASIC_CONTROL_IDS.xTickLabels]: true,
    [BUBBLE_BASIC_CONTROL_IDS.xGrid]: true,
    [BUBBLE_BASIC_CONTROL_IDS.pointStrokeEnabled]: false,
    [BUBBLE_BASIC_CONTROL_IDS.pointStroke]: 'currentColor',
    [BUBBLE_BASIC_CONTROL_IDS.pointShape]: 'circle',
    [BUBBLE_BASIC_CONTROL_IDS.pointFillOpacity]: 0.7,
  },
  relatedApis: [
    'ChartExtension.coordinate',
    'BubbleEncodings.x',
    'BubbleEncodings.y',
    'BubbleEncodings.size',
    'BubbleEncodings.color',
    'PlotAxis.ticks',
    'PlotAxis.tickLabels',
    'PlotAxis.grid',
    'BubbleProperties.stroke',
    'BubbleProperties.shape',
    'BubbleProperties.fillOpacity',
  ],
} satisfies PreviewControlContract;
