import { ScatterChart, ScatterEncodings, ScatterMark, ScatterProperties } from '@retikz/chart-react/point';
import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { createPreviewControlContract } from './scatter-marks.controls';
import type { DemoValues } from './scatter-marks.controls';
import { scatterMinimalData } from './scatter-minimal.data';

const contract = createPreviewControlContract();

/** 叠加两组继承相同位置映射的散点 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) => {
  const chart = (
    <ScatterChart rows={scatterMinimalData} layout={dimensions ?? { width: 720, height: 440 }}>
      <ScatterEncodings x="imdbRating" y="rottenTomatoesRating" />
      <ScatterProperties size={values.baseSize} opacity={values.baseOpacity} />
      <ScatterMark override={values.override} properties={{ size: values.size, opacity: values.opacity }} />
    </ScatterChart>
  );
  return chart;
};

/** 源码视图复用电影评分数据 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

const ScatterMarks: FC = () => render(usePreviewDimensions(), usePreviewControls(contract.controls));
export default ScatterMarks;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './scatter-marks.controls';
export const previewControls = contract.controls;
