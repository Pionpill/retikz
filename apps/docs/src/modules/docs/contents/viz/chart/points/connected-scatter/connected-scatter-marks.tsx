import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { createPreviewControlContract } from './connected-scatter-marks.controls';
import type { DemoValues } from './connected-scatter-marks.controls';
import { renderConnectedScatterMarksPreview } from './connected-scatter-marks.preview';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderConnectedScatterMarksPreview(dimensions, values);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: { 'chart.data': { name: 'connectedScatterData', from: './connected-scatter-basic.data' } },
};

/** 随演示区域重新布局 */
const ConnectedScatterMarks: FC = () => {
  return render(usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default ConnectedScatterMarks;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './connected-scatter-marks.controls';
export const previewControls = contract.controls;
