import { ChartData } from '@retikz/chart-react';
import { RegressionChart, RegressionEncodings, RegressionProperties } from '@retikz/chart-react/point';
import type { IRRegressionMethod } from '@retikz/data';

import { regressionTrendPropertiesOf } from './regression-basic-style';
import { irisRegressionData } from './regression-basic.data';

type RegressionMethodKind = IRRegressionMethod['kind'];

const methodOf = (kind: RegressionMethodKind, order: number): IRRegressionMethod => {
  return kind === 'polynomial' ? { kind, order } : { kind };
};

/** 图形参数 */
export type RegressionBasicPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  groupBySpecies: boolean;
  pointSize: number;
  pointOpacity: number;
  method: 'linear' | 'quadratic' | 'polynomial' | 'logarithmic' | 'exponential' | 'power';
  order: number;
  sampleCount: number;
  trendStrokeColor: string;
  trendLineStyle: 'solid' | 'dashed';
  trendStrokeWidth: number;
  trendStrokeOpacity: number;
};

/** 绘制示例图形 */
export const renderRegressionBasicPreview = (
  values: RegressionBasicPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const chart = (
    <RegressionChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      layout={dimensions ? { ...dimensions, padding: { right: 48 } } : undefined}
    >
      <ChartData data={irisRegressionData} />
      <RegressionEncodings
        x="sepalLengthCm"
        y="petalLengthCm"
        {...(values.groupBySpecies ? { series: 'species' } : {})}
      />
      <RegressionProperties
        point={{
          size: values.pointSize,
          opacity: values.pointOpacity,
        }}

        method={methodOf(values.method, values.order)}
        sampleCount={values.sampleCount}

        trend={regressionTrendPropertiesOf(
          values.groupBySpecies,
          values.trendStrokeColor,
          values.trendLineStyle,
          values.trendStrokeWidth,
          values.trendStrokeOpacity,
        )}
      />
    </RegressionChart>
  );
  return chart;
};
