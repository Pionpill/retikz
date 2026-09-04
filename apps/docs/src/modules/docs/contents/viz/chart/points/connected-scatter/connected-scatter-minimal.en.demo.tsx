import type { FC } from 'react';

import { ConnectedScatterChart } from '@retikz/chart-react/point';

import { connectedScatterMinimalData } from './connected-scatter-minimal.data';

/** Connected Scatter basic usage with required configuration and presentation metadata on the root */
const Demo: FC = () => (
  <ConnectedScatterChart
    rows={connectedScatterMinimalData}
    presentation={{
      title: 'The monthly trajectory of construction unemployment',
      subtitle: '100 consecutive months; month index on x and unemployment rate (%) on y',
      source: 'Vega Datasets unemployment-across-industries.json; accessed 2026-09-01',
    }}
    recipe={{ encodings: { x: 'month', y: 'unemploymentRate', order: 'month' } }}
  />
);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: {
    'chart.data': { name: 'connectedScatterMinimalData', from: './connected-scatter-minimal.data' },
  },
};

export default Demo;
