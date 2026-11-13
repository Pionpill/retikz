import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderSlopeMinimal } from './slope-minimal.preview';

/** 默认线宽为 2，显示观测点和两端标签 */
const SlopeMinimal: FC = () => renderSlopeMinimal(usePreviewDimensions());
export default SlopeMinimal;

/** 源码视图与响应式示例复用同一图形 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => renderSlopeMinimal(),
  datasetImports: { 'chart.data': { name: 'slopeData', from: './slope-basic.data' } },
};

export { createPreviewControlContract } from './slope-minimal.controls';
