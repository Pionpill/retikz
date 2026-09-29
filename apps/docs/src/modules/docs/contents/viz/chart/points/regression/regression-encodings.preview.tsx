import { RegressionChart, RegressionEncodings } from '@retikz/chart-react/point';

import { irisRegressionData } from './regression-basic.data';

/** 图形参数 */
export type RegressionEncodingsPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  group: boolean;
};

/** 绘制示例图形 */
export const renderRegressionEncodingsPreview = (
  values: RegressionEncodingsPreviewValues,
  dimensions?: { width: number; height: number },
) => {
  return (
    <RegressionChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={irisRegressionData}
      layout={dimensions}
    >
      <RegressionEncodings x="sepalLengthCm" y="petalLengthCm" {...(values.group ? { series: 'species' } : {})} />
    </RegressionChart>
  );
};
