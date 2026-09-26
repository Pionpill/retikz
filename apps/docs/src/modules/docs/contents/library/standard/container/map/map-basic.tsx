import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/container';
import type { FC } from 'react';

const MapBasic: FC = () => (
  <Layout>
    <Map
      entries={[
        {
          key: {
            content: 'a',
          },
          value: {
            content: '1',
          },
        },
        {
          key: {
            content: 'b',
          },
          value: {
            content: '2',
          },
        },
      ]}
    />
  </Layout>
);
export default MapBasic;
