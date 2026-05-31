import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 种 shape 并排
 * @description rectangle（默认）/ circle / ellipse / diamond；外围 4 个连到中央 hub，path 端点按各自 shape 自动贴边。
 */
const Demo: FC = () => (
  <Layout width={360} height={220}>
    <Node id="hub" position={[0, 0]}>
      hub
    </Node>
    <Node id="rect" position={[-120, -60]}>
      rectangle
    </Node>
    <Node id="circ" shape="circle" position={[120, -60]}>
      circle
    </Node>
    <Node id="elli" shape="ellipse" position={[120, 60]}>
      ellipse
    </Node>
    <Node id="diam" shape="diamond" position={[-120, 60]}>
      diamond
    </Node>
    <Draw way={['rect', 'hub']} arrow="->" />
    <Draw way={['circ', 'hub']} arrow="->" />
    <Draw way={['elli', 'hub']} arrow="->" />
    <Draw way={['diam', 'hub']} arrow="->" />
  </Layout>
);

export default Demo;
