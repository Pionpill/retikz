import { RegressionChart } from '@retikz/chart-react/point';

import { fixedSlopeFit, fixedSlopeFitImplementation } from './regression-custom-fit';
import { fixedSlopeRows } from './regression-custom.data';

const lowerOptions = {
  regressionDefinitions: [fixedSlopeFit],
  regressionImplementations: [fixedSlopeFitImplementation],
};

/** 自定义固定斜率拟合的图形参数 */
export type RegressionCustomPreviewOptions = {
  slope: number;
  dimensions?: { width: number; height: number };
};

/** 通过已注册的固定斜率算法绘制拟合线 */
export const renderRegressionCustomPreview = (options: RegressionCustomPreviewOptions) => {
  const { slope, dimensions } = options;
  return (
    <RegressionChart
      rows={fixedSlopeRows}
      lowerOptions={lowerOptions}
      layout={dimensions}
      recipe={{
        encodings: { x: 'x', y: 'y' },
        properties: {
          method: { kind: 'fixed-slope', slope },
          point: { size: 6 },
          trend: { stroke: 'darkorange', strokeWidth: 2 },
        },
      }}
    />
  );
};
