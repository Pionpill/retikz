import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={560} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="react" position={[-200, -55]} stroke="none">
      @retikz/react
    </Node>
    <Node id="vanilla" position={[-200, 55]} stroke="none">
      @retikz/vanilla
    </Node>
    <Node id="render" position={[-10, 0]} stroke="none">
      @retikz/render
    </Node>
    <Node id="core" position={[185, 0]} stroke="none">
      @retikz/core
    </Node>

    <Draw way={['react', 'render']} arrow="->" />
    <Draw way={['vanilla', 'render']} arrow="->" />
    <Draw way={['render', 'core']} arrow="->" />
    <Draw way={['react', { bend: 'left', angle: 28 }, 'core']} arrow="->" dashPattern={[4, 3]} />
    <Draw way={['vanilla', { bend: 'right', angle: 28 }, 'core']} arrow="->" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
