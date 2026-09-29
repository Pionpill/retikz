import { RegressionChart } from '@retikz/chart-react/point';

import { regressionMinimalData } from './regression-minimal.data';

/** 绘制示例图形 */
export const renderRegressionMinimalPreview = (dimensions: { width: number; height: number } | undefined) => (
  <RegressionChart
    layout={dimensions}
    rows={regressionMinimalData}
    recipe={{ encodings: { x: 'distanceMiles', y: 'delayMinutes' } }}
  />
);
