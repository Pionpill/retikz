import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { createPreviewControlContract } from './scatter-marks.controls';
import type { DemoValues } from './scatter-marks.controls';
import { renderScatterMarksPreview } from './scatter-marks.preview';

const contract = createPreviewControlContract();

/** 替换默认散点并调整图元外观 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderScatterMarksPreview({
    layout: dimensions ?? { width: 720, height: 440 },
    coordinateSystem: values.coordinateSystem === 'polar2D' ? 'polar2D' : 'cartesian2D',
    size: values.size,
    opacity: values.opacity,
  });

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
