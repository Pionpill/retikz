import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={760} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="spec" position={[-300, 0]} shape="rectangle" fill="gray" fillOpacity={0.08} stroke="gray" padding={10}>
      Plain spec
    </Node>
    <Node
      id="normalize"
      position={[-150, 0]}
      shape="rectangle"
      fill="darkorange"
      fillOpacity={0.08}
      stroke="darkorange"
      padding={10}
    >
      normalize
    </Node>
    <Node id="ir" position={[0, 0]} shape="rectangle" fill="gray" fillOpacity={0.08} stroke="gray" padding={10}>
      Core IR
    </Node>
    <Node id="scene" position={[145, 0]} shape="rectangle" fill="gray" fillOpacity={0.08} stroke="gray" padding={10}>
      Scene
    </Node>
    <Node id="output" position={[290, 0]} shape="rectangle" fill="gray" fillOpacity={0.08} stroke="gray" padding={10}>
      SVG DOM / Canvas / SVG string
    </Node>

    <Draw way={['spec', 'normalize']} arrow="->" stroke="gray" />
    <Draw way={['normalize', 'ir']} arrow="->" stroke="gray" />
    <Draw way={['ir', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['scene', 'output']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
