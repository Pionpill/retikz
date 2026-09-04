import type { FC } from 'react';

import { ScatterChart } from '@retikz/chart-react/point';

import { scatterMinimalData } from './scatter-minimal.data';

/** 只在根组件传入必要配置与图表说明的 Scatter 基础用法 */
const Demo: FC = () => (
  <ScatterChart
    rows={scatterMinimalData}
    presentation={{
      title: 'IMDb 与烂番茄评分总体同向',
      subtitle: '100 部双评分有效电影；横轴为 IMDb 评分，纵轴为烂番茄评分',
      source: 'Vega Datasets movies.json；访问于 2026-09-01',
    }}
    recipe={{ encodings: { x: 'imdbRating', y: 'rottenTomatoesRating' } }}
  />
);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

export default Demo;
