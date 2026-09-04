import type { FC } from 'react';

import { ConnectedScatterChart } from '@retikz/chart-react/point';

import { connectedScatterMinimalData } from './connected-scatter-minimal.data';

/** 只在根组件传入必要配置与图表说明的 Connected Scatter 基础用法 */
const Demo: FC = () => (
  <ConnectedScatterChart
    rows={connectedScatterMinimalData}
    presentation={{
      title: '建筑业失业率的月度轨迹',
      subtitle: '连续 100 个月；横轴为月份序号，纵轴为失业率（%）',
      source: 'Vega Datasets unemployment-across-industries.json；访问于 2026-09-01',
    }}
    recipe={{ encodings: { x: 'month', y: 'unemploymentRate', order: 'month' } }}
  />
);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: {
    'chart.data': { name: 'connectedScatterMinimalData', from: './connected-scatter-minimal.data' },
  },
};

export default Demo;
