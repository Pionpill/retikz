import type { FC } from 'react';

import { BubbleChart } from '@retikz/chart-react/point';

import { bubbleMinimalData } from './bubble-minimal.data';

/** Bubble basic usage with required configuration and presentation metadata on the root */
const Demo: FC = () => (
  <BubbleChart
    rows={bubbleMinimalData}
    presentation={{
      title: 'Higher-magnitude earthquakes are usually more significant',
      subtitle: '100 valid records; depth (km) on x, magnitude on y, and significance by bubble area',
      source: 'Vega Datasets earthquakes.json; accessed 2026-09-01',
    }}
    recipe={{ encodings: { x: 'depthKm', y: 'magnitude', size: 'significance' } }}
  />
);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'bubbleMinimalData', from: './bubble-minimal.data' } },
};

export default Demo;
