import { ScatterChart } from '@retikz/chart-react/point';
import type { FC } from 'react';

import { usePreviewDimensions } from '@/modules/docs/preview';

import { scatterMinimalData } from './scatter-minimal.data';

/** Scatter basic usage with required data and field mappings on the root */
const Demo: FC = () => {
  const dimensions = usePreviewDimensions();
  const chart = (
    <ScatterChart
      layout={dimensions}
      rows={scatterMinimalData}
      recipe={{ encodings: { x: 'imdbRating', y: 'rottenTomatoesRating' } }}
    />
  );
  return chart;
};

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

export default Demo;
