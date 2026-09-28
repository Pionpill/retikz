import { ScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { scatterMinimalData } from './scatter-minimal.data';

/** 只在根组件传入必要数据与字段映射的 Scatter 基础用法 */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  const chart = (
    <ScatterChart
      layout={dimensions}
      rows={scatterMinimalData}
      recipe={{ encodings: { x: 'imdbRating', y: 'rottenTomatoesRating' } }}
    />
  );
  return chart;
};

/** IR 与 Vanilla 预览使用的数据导入 */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

export default Demo;
