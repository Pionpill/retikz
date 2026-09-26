import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/container';
import type { FC } from 'react';

const MapStyles: FC = () => (
  <Layout>
    <Map
      layout={{ gap: { row: 3, column: 3 }, width: 130, height: 40, key: { width: 80 } }}
      style={{ font: { size: 14 }, key: { fill: 'dodgerblue' } }}
      entries={[
        {
          key: 'id',
          value: {
            id: 'selected',
            style: { fill: 'dodgerblue' },
            layout: { width: 160, height: 52 },
            content: 'node-a',
          },
        },
        {
          key: 'state',
          value: 'Long content clipped to the cell',
        },
      ]}
    />
    <Draw way={['selected.right', [265, 20]]} arrow="->" />
  </Layout>
);
export default MapStyles;
