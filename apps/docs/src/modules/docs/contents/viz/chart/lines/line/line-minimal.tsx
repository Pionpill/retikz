import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderLineMinimal } from './line-minimal.preview';

/** 默认线宽为 2，观测点默认隐藏 */
const LineMinimal: FC = () => renderLineMinimal(usePreviewDimensions());
export default LineMinimal;

/** 源码视图与响应式示例复用同一图形 */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => renderLineMinimal(),
  datasetImports: { 'chart.data': { name: 'lineData', from: './line-basic.data' } },
};
