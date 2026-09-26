import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/container';
import type { FC } from 'react';

const MapData: FC = () => (
  <Layout>
    <Map data={{ state: 'resolved', layout: { width: 60, height: 32 }, values: [0, false] }} dataObjectDisplay="text" />
  </Layout>
);
export default MapData;
