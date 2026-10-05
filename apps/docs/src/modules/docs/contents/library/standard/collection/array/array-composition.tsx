import { Layout } from '@retikz/react';
import { Array, ArrayItem, Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

const ArrayComposition: FC = () => (
  <Layout>
    <Array layout={{ gap: 4 }}>
      <ArrayItem text="A" />
      <ArrayItem id="record" style={{ fill: 'dodgerblue' }}>
        <Map entries={[{ key: 'id', value: 'B' }]} />
      </ArrayItem>
    </Array>
  </Layout>
);
export default ArrayComposition;
