import type { FC } from 'react';

import { RegressionChart } from '@retikz/chart-react/point';

import { regressionMinimalData } from './regression-minimal.data';

/** Regression basic usage with required configuration and presentation metadata on the root */
const Demo: FC = () => (
  <RegressionChart
    rows={regressionMinimalData}
    presentation={{
      title: 'The linear relationship between flight distance and arrival delay',
      subtitle: '100 flights; distance (miles) on x and arrival delay (minutes) on y',
      source: 'Vega Datasets flights-2k.json; accessed 2026-09-01',
    }}
    recipe={{ encodings: { x: 'distanceMiles', y: 'delayMinutes' } }}
  />
);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: { 'chart.data': { name: 'regressionMinimalData', from: './regression-minimal.data' } },
};

export default Demo;
