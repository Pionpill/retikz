import type { FC } from 'react';

import { BubbleChart } from '@retikz/chart-react/point';

import { bubbleMinimalData } from './bubble-minimal.data';

/** 只在根组件传入必要配置与图表说明的 Bubble 基础用法 */
const Demo: FC = () => (
  <BubbleChart
    rows={bubbleMinimalData}
    presentation={{
      title: '震级越高，地震显著性通常越大',
      subtitle: '100 条有效记录；横轴为深度（km），纵轴为震级，气泡面积表示显著性',
      source: 'Vega Datasets earthquakes.json；访问于 2026-09-01',
    }}
    recipe={{ encodings: { x: 'depthKm', y: 'magnitude', size: 'significance' } }}
  />
);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'bubbleMinimalData', from: './bubble-minimal.data' } },
};

export default Demo;
