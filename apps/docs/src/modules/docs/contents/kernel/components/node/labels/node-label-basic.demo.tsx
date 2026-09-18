import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const NodeLabelBasic: FC = () => (
  <Layout>
    <Node id="q" position={[0, 0]} label={{ text: 'status', position: 'top' }}>
      Q
    </Node>
  </Layout>
);

export default NodeLabelBasic;
