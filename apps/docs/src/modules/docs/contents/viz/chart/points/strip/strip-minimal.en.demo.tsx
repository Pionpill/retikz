import type { FC } from 'react';

import { StripChart } from '@retikz/chart-react/point';

import { stripPalmerPenguinsData } from './strip-palmer-penguins.data';

/** Strip Chart basic usage with one discrete and one continuous position scale */
const Demo: FC = () => (
  <StripChart
    rows={stripPalmerPenguinsData}
    presentation={{
      title: 'Flipper lengths across three penguin species',
      subtitle: '90 penguins from the Palmer Archipelago; 30 per species, flipper length in millimetres',
      source: 'Palmer Penguins (CC0); after removing missing flipper lengths, first 30 rows per species',
    }}
    recipe={{
      encodings: {
        x: { field: 'species', scale: { operation: { type: 'point', name: 'species' } } },
        y: {
          field: 'flipperLengthMm',
          scale: { operation: { type: 'linear', name: 'flipperLength' } },
        },
      },
    }}
  />
);

/** Data import used by the IR and Vanilla previews */
export const previewSource = {
  datasetImports: {
    'chart.data': { name: 'stripPalmerPenguinsData', from: './strip-palmer-penguins.data' },
  },
};

export default Demo;
