import type { IRPlotSmoothMethod } from '@retikz/plot';
import type { FC } from 'react';

import { ChartData, ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { RegressionChart, RegressionEncodings, RegressionProperties } from '@retikz/chart-react/point';

import { defineControlledPreview } from '@/modules/docs/preview';

import { resolvePointPreviewLayout } from '../point-coordinate-control';
import { previewControlContract, REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { irisRegressionData } from './regression-basic.data';
import { regressionTrendPropertiesOf } from './regression-basic-style';

type RegressionMethodKind = IRPlotSmoothMethod['kind'];

/** 把控件值映射为完整 Smooth method 判别对象 */
const methodOf = (kind: RegressionMethodKind, order: number): IRPlotSmoothMethod => {
  switch (kind) {
    case 'polynomial':
      return { kind, order };
    case 'linear':
    case 'quadratic':
    case 'logarithmic':
    case 'exponential':
    case 'power':
      return { kind };
  }
};

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <RegressionChart>
    <ChartData data={irisRegressionData} />
    <ChartLayout {...resolvePointPreviewLayout(values[REGRESSION_BASIC_CONTROL_IDS.coordinateSystem])} />
    <ChartExtension
      coordinate={
        values[REGRESSION_BASIC_CONTROL_IDS.coordinateSystem] === 'polar2D'
          ? { type: 'polar2D' }
          : { type: 'cartesian2D' }
      }
    />
    <RegressionEncodings
      x="sepalLengthCm"
      y="petalLengthCm"
      {...(values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies] ? { series: 'species' } : {})}
    />
    <RegressionProperties
      method={methodOf(values[REGRESSION_BASIC_CONTROL_IDS.method], values[REGRESSION_BASIC_CONTROL_IDS.order])}
      sampleCount={values[REGRESSION_BASIC_CONTROL_IDS.sampleCount]}
      point={{ opacity: values[REGRESSION_BASIC_CONTROL_IDS.pointOpacity] }}
      trend={regressionTrendPropertiesOf(
        values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies],
        values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor],
        values[REGRESSION_BASIC_CONTROL_IDS.trendLineStyle],
        values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth],
        values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity],
      )}
    />
    <ChartTitle>鸢尾花萼片与花瓣长度的回归趋势</ChartTitle>
    <ChartSubtitle>UCI Iris 全部 150 行观测；萼片与花瓣长度单位均为厘米，颜色表示物种</ChartSubtitle>
    <ChartSource>UCI Machine Learning Repository，DOI 10.24432/C56C76，CC BY 4.0；未筛行</ChartSource>
  </RegressionChart>
));

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
