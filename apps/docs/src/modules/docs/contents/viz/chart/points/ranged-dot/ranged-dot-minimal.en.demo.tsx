import type { FC } from 'react';

import { RangedDotChart } from '@retikz/chart-react/point';

import { rangedDotMinimalData } from './ranged-dot-minimal.data';

/** Ranged Dot basic usage with required configuration and presentation metadata on the root */
const Demo: FC = () => (
  <RangedDotChart
    rows={rangedDotMinimalData}
    presentation={{
      title: 'The first 20 daily temperature ranges in Seattle',
      subtitle: 'One row per day; degrees Celsius on x, with minimum and maximum temperature endpoints',
      source: 'Vega Datasets seattle-weather.csv; accessed 2026-09-01',
    }}
    recipe={{
      encodings: { category: 'day', start: 'minimumTemperature', end: 'maximumTemperature' },
    }}
  />
);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'rangedDotMinimalData', from: './ranged-dot-minimal.data' } },
};

export default Demo;
