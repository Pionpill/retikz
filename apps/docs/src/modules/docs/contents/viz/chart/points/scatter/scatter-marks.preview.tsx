import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart, ScatterEncodings, ScatterMark } from '@retikz/chart-react/point';

import { scatterMinimalData } from './scatter-minimal.data';

/** 散点图元替换示例的公开参数 */
export type ScatterMarksPreviewOptions = {
  layout: ScatterChartProps['layout'];
  coordinateSystem: 'cartesian2D' | 'polar2D';
  size: number;
  opacity: number;
};

/** 替换默认散点并调整图元外观 */
export const renderScatterMarksPreview = (options: ScatterMarksPreviewOptions) => {
  const { layout, coordinateSystem, size, opacity } = options;
  return (
    <ScatterChart coordinate={{ type: coordinateSystem }} rows={scatterMinimalData} layout={layout}>
      <ScatterEncodings x="imdbRating" y="rottenTomatoesRating" />
      <ScatterMark override properties={{ size, opacity }} />
    </ScatterChart>
  );
};
