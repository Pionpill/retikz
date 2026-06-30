import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={420} height={220}>
    <Node id="default" position={[0, 40]} label={{ text: '默认', position: 'top' }}>
      A
    </Node>
    <Node id="far" position={[150, 40]} label={{ text: '上方 20', position: 'top', distance: 20 }}>
      B
    </Node>
  </Layout>
);

export default Demo;
