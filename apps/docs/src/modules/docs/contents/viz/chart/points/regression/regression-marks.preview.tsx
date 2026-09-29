import { RegressionChart, RegressionMark } from '@retikz/chart-react/point';

import { irisRegressionData } from './regression-basic.data';

/** 图形参数 */
export type RegressionMarksPreviewValues = {
  coordinateSystem: 'cartesian2D' | 'polar2D';
  size: number;
  opacity: number;
  method: 'linear' | 'quadratic';
  strokeWidth: number;
};

/** 绘制示例图形 */
export const renderRegressionMarksPreview = (
  dimensions: { width: number; height: number } | undefined,
  values: RegressionMarksPreviewValues,
) => {
  const bounds = dimensions ?? { width: 720, height: 440 };

  const chart = (
    <RegressionChart
      coordinate={values.coordinateSystem === 'polar2D' ? { type: 'polar2D' } : { type: 'cartesian2D' }}
      rows={irisRegressionData}
      layout={{ ...bounds, padding: { right: 48 } }}

      recipe={{
        encodings: { x: 'sepalLengthCm', y: 'petalLengthCm', series: 'species' },
        properties: { point: { size: values.size, opacity: values.opacity }, trend: { strokeWidth: 2 } },
      }}
    >
      <RegressionMark
        override
        properties={{ method: { kind: values.method }, trend: { strokeWidth: values.strokeWidth } }}
      />
    </RegressionChart>
  );
  return chart;
};
