import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

import { irisRegressionData } from './regression-basic.data';

/** Regression 基础 playground 的稳定控件 id */
export const REGRESSION_BASIC_CONTROL_IDS = {
  groupBySpecies: 'regression-basic-group-by-species',
  method: 'regression-basic-method',
  order: 'regression-basic-order',
  sampleCount: 'regression-basic-sample-count',
  pointOpacity: 'regression-basic-point-opacity',
  trendStrokeWidth: 'regression-basic-trend-stroke-width',
} as const;

/** Regression 基础示例的中文控制面板 */
export const regressionBasicControls = definePreviewControls({
  presentation: 'panel',
  title: '回归趋势',
  sections: [
    {
      label: '数据',
      defaultCollapsed: true,
      controls: [
        {
          kind: 'table',
          id: 'rows',
          label: 'UCI Iris 全部观测',
          rows: irisRegressionData,
          columns: [
            { key: 'sepalLengthCm', label: '萼片长度（厘米）' },
            { key: 'petalLengthCm', label: '花瓣长度（厘米）' },
            { key: 'species', label: '物种' },
          ],
        },
      ],
    },
    {
      label: '拟合',
      controls: [
        {
          kind: 'switch',
          id: REGRESSION_BASIC_CONTROL_IDS.groupBySpecies,
          label: '按物种分别拟合',
          defaultValue: true,
        },
        {
          kind: 'select',
          id: REGRESSION_BASIC_CONTROL_IDS.method,
          label: '回归方法',
          defaultValue: 'linear',
          options: [
            { value: 'linear', label: '线性' },
            { value: 'quadratic', label: '二次多项式' },
            { value: 'polynomial', label: '可配置多项式' },
            { value: 'logarithmic', label: '对数' },
            { value: 'exponential', label: '指数' },
            { value: 'power', label: '幂' },
          ],
        },
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.order,
          label: '多项式阶数',
          defaultValue: 3,
          min: 2,
          max: 6,
          step: 1,
          visibleWhen: { controlId: REGRESSION_BASIC_CONTROL_IDS.method, oneOf: ['polynomial'] },
        },
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.sampleCount,
          label: '趋势采样数',
          defaultValue: 64,
          min: 16,
          max: 128,
          step: 8,
        },
      ],
    },
    {
      label: '观测点',
      controls: [
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.pointOpacity,
          label: '不透明度',
          defaultValue: 0.55,
          min: 0.2,
          max: 1,
          step: 0.05,
        },
      ],
    },
    {
      label: '趋势线',
      controls: [
        {
          kind: 'range',
          id: REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth,
          label: '线宽',
          defaultValue: 2,
          min: 1,
          max: 6,
          step: 0.5,
        },
      ],
    },
  ],
});

/** Regression 基础示例的稳定文档契约 */
export const previewControlContract = {
  controls: regressionBasicControls,
  canonicalValues: {
    [REGRESSION_BASIC_CONTROL_IDS.groupBySpecies]: true,
    [REGRESSION_BASIC_CONTROL_IDS.method]: 'linear',
    [REGRESSION_BASIC_CONTROL_IDS.order]: 3,
    [REGRESSION_BASIC_CONTROL_IDS.sampleCount]: 64,
    [REGRESSION_BASIC_CONTROL_IDS.pointOpacity]: 0.55,
    [REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth]: 2,
  },
  relatedApis: [
    'RegressionEncodings.series',
    'RegressionProperties.method',
    'RegressionProperties.sampleCount',
    'RegressionProperties.point.opacity',
    'RegressionProperties.trend.strokeWidth',
  ],
} satisfies PreviewControlContract;
