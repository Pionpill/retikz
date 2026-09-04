import type { FC } from 'react';

import { StripChart } from '@retikz/chart-react/point';

import { stripPalmerPenguinsData } from './strip-palmer-penguins.data';

/** 使用一个离散位置 scale 与一个连续位置 scale 的 Strip Chart 基础用法 */
const Demo: FC = () => (
  <StripChart
    rows={stripPalmerPenguinsData}
    presentation={{
      title: '三种企鹅的鳍长分布',
      subtitle: 'Palmer 群岛 90 只企鹅；每个物种 30 只，鳍长单位为毫米',
      source: 'Palmer Penguins（CC0）；移除鳍长缺失值后，每个物种按原始顺序取前 30 条',
    }}
    recipe={{
      encodings: {
        x: { field: 'species', scale: { operation: { type: 'point', name: 'species' } } },
        y: {
          field: 'flipperLengthMm',
          scale: { operation: { type: 'linear', name: 'flipperLength' } },
        },
      },
    }}
  />
);

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: {
    'chart.data': { name: 'stripPalmerPenguinsData', from: './strip-palmer-penguins.data' },
  },
};

export default Demo;
