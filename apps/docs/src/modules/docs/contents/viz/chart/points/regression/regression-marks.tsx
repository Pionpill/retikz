import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { createPreviewControlContract } from './regression-marks.controls';
import type { DemoValues } from './regression-marks.controls';
import { renderRegressionMarksPreview } from './regression-marks.preview';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderRegressionMarksPreview(dimensions, values);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: { 'chart.data': { name: 'irisRegressionData', from: './regression-basic.data' } },
};

/** 随演示区域重新布局 */
const RegressionMarks: FC = () => {
  return render(usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default RegressionMarks;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './regression-marks.controls';
export const previewControls = contract.controls;
