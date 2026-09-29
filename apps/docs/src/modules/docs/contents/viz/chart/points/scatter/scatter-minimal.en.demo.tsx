import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { renderScatterMinimalPreview } from './scatter-minimal.preview';

/** Scatter basic usage with required data and field mappings on the root */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  return renderScatterMinimalPreview(dimensions);
};

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

export default Demo;
