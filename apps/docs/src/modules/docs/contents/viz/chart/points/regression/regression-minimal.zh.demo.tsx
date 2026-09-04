import type { FC } from 'react';

import { RegressionChart } from '@retikz/chart-react/point';

import { regressionMinimalData } from './regression-minimal.data';

/** 只在根组件传入必要配置与图表说明的 Regression 基础用法 */
const Demo: FC = () => (
  <RegressionChart
    rows={regressionMinimalData}
    presentation={{
      title: '航程与到达延误的线性关系',
      subtitle: '100 个航班；横轴为航程（英里），纵轴为到达延误（分钟）',
      source: 'Vega Datasets flights-2k.json；访问于 2026-09-01',
    }}
    recipe={{ encodings: { x: 'distanceMiles', y: 'delayMinutes' } }}
  />
);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'regressionMinimalData', from: './regression-minimal.data' } },
};

export default Demo;
