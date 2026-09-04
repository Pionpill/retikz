import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { weatherRows } from './coordinate-composition-scopes.data';

/** 双纵轴 demo 的稳定控件 id */
export const COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS = {
  rainfallAxis: 'rainfallAxis',
  secondaryAxisSide: 'secondaryAxisSide',
  xGridVisible: 'xGridVisible',
  yGridVisible: 'yGridVisible',
  temperatureLineWidth: 'temperatureLineWidth',
  rainfallLineWidth: 'rainfallLineWidth',
  rainfallPointsVisible: 'rainfallPointsVisible',
  rainfallPointSize: 'rainfallPointSize',
} as const;

/** 双纵轴示例的中文控件 */
export const coordinateCompositionScopesControls = definePreviewControls({
  presentation: 'panel',
  title: '双纵轴',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: '天气指标',
          rows: weatherRows,
          columns: [{ key: 'day' }, { key: 'temperature' }, { key: 'rainfall' }],
        },
      ],
    },
    {
      label: '轴绑定',
      controls: [
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallAxis,
          label: '降雨纵轴',
          defaultValue: 'rainfall',
          options: [
            { value: 'rainfall', label: '独立纵轴' },
            { value: 'default', label: '默认纵轴' },
          ],
        },
        {
          kind: 'select',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.secondaryAxisSide,
          label: '附加轴位置',
          defaultValue: 'right',
          options: [
            { value: 'right', label: '右侧' },
            { value: 'left', label: '左侧' },
          ],
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.xGridVisible,
          label: '纵向网格（x 轴）',
          defaultValue: false,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.yGridVisible,
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
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.temperatureLineWidth,
          label: '温度线宽',
          defaultValue: 2.5,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallLineWidth,
          label: '降雨线宽',
          defaultValue: 2,
          min: 0.5,
          max: 5,
          step: 0.5,
        },
        {
          kind: 'switch',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible,
          label: '显示降雨点',
          defaultValue: true,
        },
        {
          kind: 'range',
          id: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointSize,
          label: '降雨点尺寸',
          defaultValue: 6,
          min: 3,
          max: 14,
          step: 1,
          visibleWhen: {
            controlId: COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible,
            oneOf: [true],
          },
        },
      ],
    },
  ],
});

/** 双纵轴示例的稳定文档契约 */
export const previewControlContract = {
  controls: coordinateCompositionScopesControls,
  canonicalValues: {
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallAxis]: 'rainfall',
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.secondaryAxisSide]: 'right',
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.xGridVisible]: false,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.yGridVisible]: false,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.temperatureLineWidth]: 2.5,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallLineWidth]: 2,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointsVisible]: true,
    [COORDINATE_COMPOSITION_SCOPES_CONTROL_IDS.rainfallPointSize]: 6,
  },
  relatedApis: [
    'PlotAxis.id',
    'PlotAxis.placement',
    'PlotAxis.grid',
    'PathMark.yAxisId',
    'PathMark.strokeWidth',
    'PointMark.size',
  ],
} satisfies PreviewControlContract;
