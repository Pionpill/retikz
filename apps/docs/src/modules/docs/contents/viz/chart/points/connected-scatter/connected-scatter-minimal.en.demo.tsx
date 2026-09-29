import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderConnectedScatterMinimalPreview } from './connected-scatter-minimal.preview';

/** Connected Scatter basic usage with required data and field mappings on the root */
const render = (dimensions?: { width: number; height: number }) => renderConnectedScatterMinimalPreview(dimensions);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  deriveIR: false,
  canonicalRender: () => render(),
  datasetImports: {
    'chart.data': { name: 'connectedScatterMinimalData', from: './connected-scatter-minimal.data' },
  },
};

/** 预览尺寸改变时重新布局，源码使用无上下文的配置 */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  const chart = render(dimensions);
  return chart;
};
export default Demo;
