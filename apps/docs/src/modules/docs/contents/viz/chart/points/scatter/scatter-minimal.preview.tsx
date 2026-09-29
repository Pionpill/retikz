import type { ScatterChartProps } from '@retikz/chart-react/point';
import { ScatterChart } from '@retikz/chart-react/point';

import { scatterMinimalData } from './scatter-minimal.data';

/** 用电影评分数据绘制最小散点图 */
export const renderScatterMinimalPreview = (layout?: ScatterChartProps['layout']) => (
  <ScatterChart
    layout={layout}
    rows={scatterMinimalData}
    recipe={{ encodings: { x: 'imdbRating', y: 'rottenTomatoesRating' } }}
  />
);
