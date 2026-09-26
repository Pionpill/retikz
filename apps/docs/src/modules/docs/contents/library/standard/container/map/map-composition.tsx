import { Layout } from '@retikz/react';
import { List, Map, MapEntry, MapKey, MapValue } from '@retikz/standard-react/container';
import type { FC } from 'react';

const MapComposition: FC = () => (
  <Layout>
    <Map>
      <MapEntry>
        <MapKey text="name" />
        <MapValue text="A" />
      </MapEntry>
      <MapEntry>
        <MapKey text="items" />
        <MapValue id="items" style={{ fill: 'dodgerblue' }}>
          <List items={[{ content: 'B' }, { content: 'C' }]} />
        </MapValue>
      </MapEntry>
    </Map>
  </Layout>
);
export default MapComposition;
