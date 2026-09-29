import { ChartData } from '@retikz/chart-react';
import { StripChart, StripEncodings, StripProperties } from '@retikz/chart-react/point';

import { stripVegaBarleyData } from './strip-vega-barley.data';

/** 图形参数 */
export type StripBasicPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  jitterSpan: number;
  distribution: 'uniform' | 'normal';
  normalSigma: number;
  seed: number;
  pointSize: number;
  pointOpacity: number;
};

/** 绘制示例图形 */
export const renderStripBasicPreview = (
  values: StripBasicPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  const chart = (
    <StripChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      layout={dimensions}
    >
      <ChartData data={stripVegaBarleyData} />
      <StripEncodings
        x={{ field: 'site', scale: { operation: { type: 'point', name: 'site' } } }}
        y={{ field: 'yield', scale: { operation: { type: 'linear', name: 'yield' } } }}
      />
      <StripProperties
        jitter={{
          span: { kind: 'ratio', value: values.jitterSpan },
          distribution:
            values.distribution === 'normal' ? { kind: 'normal', sigma: values.normalSigma } : { kind: 'uniform' },
          seed: values.seed,
        }}
        size={values.pointSize}
        opacity={values.pointOpacity}
      />
    </StripChart>
  );
  return chart;
};
