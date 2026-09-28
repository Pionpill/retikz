import { ChartData } from '@retikz/chart-react';
import { RegressionChart, RegressionEncodings, RegressionProperties } from '@retikz/chart-react/point';
import type { IRRegressionMethod } from '@retikz/data';
import type { FC } from 'react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { regressionTrendPropertiesOf } from './regression-basic-style';
import { previewControlContract, REGRESSION_BASIC_CONTROL_IDS } from './regression-basic.controls';
import { irisRegressionData } from './regression-basic.data';

type RegressionMethodKind = IRRegressionMethod['kind'];

/** 把控件值映射为完整 Smooth method 判别对象 */
const methodOf = (kind: RegressionMethodKind, order: number): IRRegressionMethod => {
  return kind === 'polynomial' ? { kind, order } : { kind };
};

const controlledPreview = defineControlledPreview(previewControlContract, (values, dimensions) => {
  const chart = (
    <RegressionChart layout={dimensions ? { ...dimensions, padding: { right: 48 } } : undefined}>
      <ChartData data={irisRegressionData} />
      <RegressionEncodings
        x="sepalLengthCm"
        y="petalLengthCm"
        {...(values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies] ? { series: 'species' } : {})}
      />
      <RegressionProperties
        point={{
          size: values[REGRESSION_BASIC_CONTROL_IDS.pointSize],
          opacity: values[REGRESSION_BASIC_CONTROL_IDS.pointOpacity],
        }}

        method={methodOf(values[REGRESSION_BASIC_CONTROL_IDS.method], values[REGRESSION_BASIC_CONTROL_IDS.order])}
        sampleCount={values[REGRESSION_BASIC_CONTROL_IDS.sampleCount]}

        trend={regressionTrendPropertiesOf(
          values[REGRESSION_BASIC_CONTROL_IDS.groupBySpecies],
          values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeColor],
          values[REGRESSION_BASIC_CONTROL_IDS.trendLineStyle],
          values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeWidth],
          values[REGRESSION_BASIC_CONTROL_IDS.trendStrokeOpacity],
        )}
      />
    </RegressionChart>
  );
  return chart;
});

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
