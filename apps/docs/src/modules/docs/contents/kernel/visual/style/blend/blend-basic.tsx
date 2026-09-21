import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout>
    <Node position={[25, 0]} layout={{ minimumSize: 80 }} style={{ fill: 'dodgerblue' }} />
    <Node position={[0, 0]} layout={{ minimumSize: 80 }} style={{ fill: 'darkorange', blendMode: 'multiply' }} />
  </Layout>
);
export default Demo;
