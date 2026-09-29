import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { renderRegressionBasicPreview } from './regression-basic.preview';

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) =>
  renderRegressionBasicPreview(
    {
      coordinateSystem: values[REGRESSION_BASIC_CONTROL_IDS.coordinateSystem],
      groupBySpecies: values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies],
      pointSize: values[REGRESSION_BASIC_CONTROL_IDS.pointSize],
      pointOpacity: values[REGRESSION_BASIC_CONTROL_IDS.pointOpacity],
      method: values[REGRESSION_BASIC_CONTROL_IDS.method],
      order: values[REGRESSION_BASIC_CONTROL_IDS.order],
      sampleCount: values[REGRESSION_BASIC_CONTROL_IDS.sampleCount],
      trendStrokeColor: values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor],
      trendLineStyle: values[REGRESSION_BASIC_CONTROL_IDS.trendLineStyle],
      trendStrokeWidth: values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth],
      trendStrokeOpacity: values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity],
    },
    dimensions,
  ),
);

/** canonical 状态派生的稳定源码配置 */
export const previewSource = {
  ...controlledPreview.source,
  datasetImports: {
    'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' },
  },
};

/** controls registry 缺失时使用的显式回退 */
export const previewControls = previewControlContract.controls;

/** 展示 Iris 观测与分组回归趋势的基础 Regression 图 */
const Demo: FC = controlledPreview.Component;

export default Demo;
