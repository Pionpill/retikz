import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={760} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="ir" position={[-340, 0]} stroke="none">
      IR
    </Node>
    <Node id="nodes" position={[-230, 0]} stroke="none">
      layout nodes
    </Node>
    <Node id="paths" position={[-40, 0]} stroke="none">
      resolve paths
    </Node>
    <Node id="bounds" position={[150, 0]} stroke="none">
      fit bounds
    </Node>
    <Node id="scene" position={[340, 0]} stroke="none">
      Scene
    </Node>

    <Draw way={['ir', 'nodes']} arrow="->" />
    <Draw way={['nodes', { label: { text: 'anchors', side: 'top', textColor: 'gray' } }, 'paths']} arrow="->" />
    <Draw way={['paths', { label: { text: 'primitives', side: 'top', textColor: 'gray' } }, 'bounds']} arrow="->" />
    <Draw way={['bounds', { label: { text: 'viewBox', side: 'top', textColor: 'gray' } }, 'scene']} arrow="->" />
  </Layout>
);

export default Demo;
