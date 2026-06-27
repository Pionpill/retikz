import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={420} height={220}>
    <Node id="default" position={[0, 40]} label={{ text: '默认', position: 'above' }}>
      A
    </Node>
    <Node id="far" position={[150, 40]} label={{ text: '上方 20', position: 'above', distance: 20 }}>
      B
    </Node>
  </Layout>
);

export default Demo;
