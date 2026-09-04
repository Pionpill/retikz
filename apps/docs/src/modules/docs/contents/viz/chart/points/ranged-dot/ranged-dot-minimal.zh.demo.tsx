import type { FC } from 'react';

import { RangedDotChart } from '@retikz/chart-react/point';

import { rangedDotMinimalData } from './ranged-dot-minimal.data';

/** 只在根组件传入必要配置与图表说明的 Ranged Dot 基础用法 */
const Demo: FC = () => (
  <RangedDotChart
    rows={rangedDotMinimalData}
    presentation={{
      title: 'Seattle 前 20 天的每日气温范围',
      subtitle: '每行代表一天；横轴为摄氏度，两个端点分别表示最低与最高气温',
      source: 'Vega Datasets seattle-weather.csv；访问于 2026-09-01',
    }}
    recipe={{
      encodings: { category: 'day', start: 'minimumTemperature', end: 'maximumTemperature' },
    }}
  />
);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'rangedDotMinimalData', from: './ranged-dot-minimal.data' } },
};

export default Demo;
