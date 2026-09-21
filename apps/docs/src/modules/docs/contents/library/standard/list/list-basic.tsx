import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react';
import type { FC } from 'react';

const ListBasic: FC = () => (
  <Layout>
    <List items={['A', 'B']} />
  </Layout>
);
export default ListBasic;
