import type { FC } from 'react';

import { ScatterChart } from '@retikz/chart-react/point';

import { scatterMinimalData } from './scatter-minimal.data';

/** Scatter basic usage with required configuration and presentation metadata on the root */
const Demo: FC = () => (
  <ScatterChart
    rows={scatterMinimalData}
    presentation={{
      title: 'IMDb and Rotten Tomatoes ratings broadly move together',
      subtitle: '100 films with both ratings; IMDb on x and Rotten Tomatoes on y',
      source: 'Vega Datasets movies.json; accessed 2026-09-01',
    }}
    recipe={{ encodings: { x: 'imdbRating', y: 'rottenTomatoesRating' } }}
  />
);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'scatterMinimalData', from: './scatter-minimal.data' } },
};

export default Demo;
