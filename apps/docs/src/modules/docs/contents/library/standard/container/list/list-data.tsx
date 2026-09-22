import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';
import type { FC } from 'react';

const ListData: FC = () => (
  <Layout>
    <List label={{ text: 'values' }} data={['a', 'a', null, { ready: false }, [1, 2]]} />
  </Layout>
);
export default ListData;
