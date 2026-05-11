import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 4 种 shape 并排
 * @description rectangle（默认）/ circle / ellipse / diamond；外围 4 个连到中央 hub，path 端点按各自 shape 自动贴边。
 */
const Demo: FC = () => (
  <Tikz width={420} height={260}>
    <Node id="hub" position={[0, 0]}>
      hub
    </Node>
    <Node id="rect" position={[-160, -80]}>
      rectangle
    </Node>
    <Node id="circ" shape="circle" position={[160, -80]}>
      circle
    </Node>
    <Node id="elli" shape="ellipse" position={[160, 80]}>
      ellipse
    </Node>
    <Node id="diam" shape="diamond" position={[-160, 80]}>
      diamond
    </Node>
    <Draw way={['rect', 'hub']} arrow="->" />
    <Draw way={['circ', 'hub']} arrow="->" />
    <Draw way={['elli', 'hub']} arrow="->" />
    <Draw way={['diam', 'hub']} arrow="->" />
  </Tikz>
);

export default Demo;
