import { StripChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { stripPalmerPenguinsData } from './strip-palmer-penguins.data';

/** 使用一个离散位置 scale 与一个连续位置 scale 的 Strip Chart 基础用法 */
const render = (dimensions?: { width: number; height: number }) => (
  <StripChart
    layout={dimensions}
    rows={stripPalmerPenguinsData}
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
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: {
    'chart.data': { name: 'stripPalmerPenguinsData', from: './strip-palmer-penguins.data' },
  },
};

/** 预览尺寸改变时重新布局，源码使用无上下文的配置 */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  const chart = render(dimensions);
  return chart;
};
export default Demo;
