import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react';
import type { FC } from 'react';

const MapData: FC = () => (
  <Layout>
    <Map
      label={{ text: 'record' }}
      data={{ state: 'resolved', layout: { width: 60, height: 32 }, values: [0, false] }}
    />
  </Layout>
);
export default MapData;
