import type { FC } from 'react';

import type { PreviewDimensions } from '@/modules/docs/components/component-preview/context';
import { usePreviewControls, usePreviewDimensions } from '@/modules/docs/preview';

import { createPreviewControlContract } from './ranged-dot-marks.controls';
import type { DemoValues } from './ranged-dot-marks.controls';
import { renderRangedDotMarksPreview } from './ranged-dot-marks.preview';

const contract = createPreviewControlContract();

/** 在预览尺寸或源码基准尺寸中使用同一图表配置 */
const render = (dimensions?: PreviewDimensions, values: DemoValues = contract.canonicalValues) =>
  renderRangedDotMarksPreview(dimensions, values);

/** 源码视图使用相同配置，避免依赖 React 容器上下文 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: { 'chart.data': { name: 'rangedDotData', from: './ranged-dot-basic.data' } },
};

/** 随演示区域重新布局 */
const RangedDotMarks: FC = () => {
  return render(usePreviewDimensions(), usePreviewControls(contract.controls));
};
export default RangedDotMarks;

/** 控件模块的显式注册回退 */
export { createPreviewControlContract } from './ranged-dot-marks.controls';
export const previewControls = contract.controls;
