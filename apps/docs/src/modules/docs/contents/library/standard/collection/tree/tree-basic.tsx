import { Layout } from '@retikz/react';
import { Tree } from '@retikz/standard-react/collection';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout>
    <Tree root={{ content: 'A', children: ['B', { content: 'C', children: [null, 'D'] }] }} />
  </Layout>
);
export default Demo;
