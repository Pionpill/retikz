import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={360} height={180}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="note" position={{ of: 'a', offset: [80, -36] }}>
      note
    </Node>
    <Node id="badge" position={{ of: 'a', offset: [120, 52] }}>
      badge
    </Node>
    <Draw way={['a', 'note']} arrow="->" />
    <Draw way={['a', 'badge']} arrow="->" />
  </Layout>
);

export default Demo;
