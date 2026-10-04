import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

const ArrayBasic: FC = () => (
  <Layout>
    <Array items={['A', 'B']} />
  </Layout>
);
export default ArrayBasic;
