import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout>
    <Node position={[0, 0]} layout={{ minimumSize: 80 }} style={{ fill: 'steelblue', shadow: 'md' }} />
  </Layout>
);
export default Demo;
