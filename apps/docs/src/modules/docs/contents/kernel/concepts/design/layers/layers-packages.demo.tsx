import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={720} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="react" position={[-285, -85]} stroke="none">
      @retikz/react
    </Node>
    <Node id="vanilla" position={[-285, 15]} stroke="none">
      @retikz/vanilla
    </Node>
    <Node id="tex" position={[-285, 105]} stroke="none">
      @retikz/tex
    </Node>
    <Node id="render" position={[-65, -40]} stroke="none">
      @retikz/render
    </Node>
    <Node id="core" position={[150, 20]} stroke="none">
      @retikz/core
    </Node>
    <Node id="math" position={[305, 20]} stroke="none">
      @retikz/math
    </Node>

    <Draw way={['react', 'render']} arrow="->" />
    <Draw way={['vanilla', 'render']} arrow="->" />
    <Draw way={['render', 'core']} arrow="->" />
    <Draw way={['react', { bend: 'left', angle: 18 }, 'core']} arrow="->" />
    <Draw way={['vanilla', { bend: 'right', angle: 18 }, 'core']} arrow="->" />
    <Draw way={['tex', 'core']} arrow="->" />
    <Draw way={['core', 'math']} arrow="->" />
    <Draw way={['render', { bend: 'left', angle: 24 }, 'math']} arrow="->" />
  </Layout>
);

export default Demo;
