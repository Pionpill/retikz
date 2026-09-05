import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={440}
    height={220}
    rootScope={{
      defaults: {
        node: {
          shape: 'rectangle',
          style: { stroke: 'gray' },
        },
      },
    }}
  >
    <Node id="A1" position={[-100, -55]}>
      A
    </Node>
    <Node id="B1" position={[100, -5]}>
      B
    </Node>
    <Draw way={['A1', 'B1']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
    <Draw way={['A1', { horizontalTo: 'B1' }]} style={{ stroke: '#2563eb', strokeWidth: 2 }} />

    <Node id="A2" position={[-100, 55]}>
      A
    </Node>
    <Node id="B2" position={[100, 105]}>
      B
    </Node>
    <Draw way={['A2', 'B2']} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }} />
    <Draw way={['A2', { verticalTo: 'B2' }]} style={{ stroke: '#2563eb', strokeWidth: 2 }} />
  </Layout>
);

export default Demo;
