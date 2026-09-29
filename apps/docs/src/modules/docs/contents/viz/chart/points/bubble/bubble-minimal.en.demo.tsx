import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderBubbleMinimalPreview } from './bubble-minimal.preview';

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => renderBubbleMinimalPreview(),
  datasetImports: { 'chart.data': { name: 'bubbleMinimalData', from: './bubble-minimal.data' } },
};

/** 预览尺寸改变时重新布局，源码使用无上下文的配置 */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  return renderBubbleMinimalPreview(dimensions);
};
export default Demo;
