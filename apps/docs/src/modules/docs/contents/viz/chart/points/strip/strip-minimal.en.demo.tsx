import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderStripMinimalPreview } from './strip-minimal.preview';

/** Strip Chart basic usage with one discrete and one continuous position scale */
const render = (dimensions?: { width: number; height: number }) => renderStripMinimalPreview(dimensions);

/** Data import used by the IR and Vanilla previews */
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
