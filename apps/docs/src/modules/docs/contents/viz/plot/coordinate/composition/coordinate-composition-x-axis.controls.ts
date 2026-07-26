import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { releaseRows } from './coordinate-composition-x-axis.data';

/** 双横轴 demo 的稳定控件 id */
export const COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS = {
  forecastAxis: 'forecastAxis',
  secondaryAxisSide: 'secondaryAxisSide',
  xGridVisible: 'xGridVisible',
  yGridVisible: 'yGridVisible',
  completedLineWidth: 'completedLineWidth',
  forecastLineWidth: 'forecastLineWidth',
  forecastPointsVisible: 'forecastPointsVisible',
  forecastPointSize: 'forecastPointSize',
} as const;

/** 双横轴示例的中文控件 */
export const coordinateCompositionXAxisControls = definePreviewControls({
  presentation: 'panel',
  title: '双横轴',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '发布进度',
          rows: releaseRows,
          columns: [
            { key: 'elapsedDay', label: '经过天数' },
            { key: 'calendarDay', label: '日历日期' },
            { key: 'completed', label: '完成度' },
            { key: 'forecast', label: '预测值' },
          ],
        },
      ],
    },
    {
      label: '轴绑定',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastAxis,
          label: '预测横轴',
          defaultValue: 'calendar',
          options: [
            { value: 'calendar', label: '独立横轴' },
            { value: 'default', label: '默认横轴' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.secondaryAxisSide,
          label: '附加轴位置',
          defaultValue: 'top',
          options: [
            { value: 'top', label: '顶部' },
            { value: 'bottom', label: '底部' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.xGridVisible,
          label: '纵向网格（x 轴）',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.yGridVisible,
          label: '横向网格（y 轴）',
          defaultValue: false,
        },
      ],
    },
    {
      label: '图层样式',
      controls: [
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.completedLineWidth,
          label: '完成度线宽',
          defaultValue: 2.5,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastLineWidth,
          label: '预测线宽',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible,
          label: '显示预测点',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointSize,
          label: '预测点尺寸',
          defaultValue: 6,
          min: 3,
          max: 14,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

/** 双横轴示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCompositionXAxisControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastAxis]: 'calendar',
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.secondaryAxisSide]: 'top',
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.xGridVisible]: false,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.yGridVisible]: false,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.completedLineWidth]: 2.5,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastLineWidth]: 2,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointsVisible]: true,
    [COORDINATE_COMPOSITION_X_AXIS_CONTROL_IDS.forecastPointSize]: 6,
  },
  relatedApis: ['Axis.id', 'Axis.placement', 'Axis.grid', 'PathMark.xAxisId', 'PathMark.strokeWidth', 'PointMark.size'],
} satisfies PreviewControlContract;
