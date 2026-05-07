import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={300} height={300}>
    <Node id="o" position={[0, 0]} padding={16}>
      Node
    </Node>
    <Node id="n" position={[0, -100]}>
      N
    </Node>
    <Node id="s" position={[0, 100]}>
      S
    </Node>
    <Node id="e" position={[120, 0]}>
      E
    </Node>
    <Node id="w" position={[-120, 0]}>
      W
    </Node>
    <Node id="ne" position={[100, -100]}>
      NE
    </Node>
    <Node id="nw" position={[-100, -100]}>
      NW
    </Node>
    <Node id="se" position={[100, 100]}>
      SE
    </Node>
    <Node id="sw" position={[-100, 100]}>
      SW
    </Node>
    <Draw way={['n', 'o']} />
    <Draw way={['s', 'o']} />
    <Draw way={['e', 'o']} />
    <Draw way={['w', 'o']} />
    <Draw way={['ne', 'o']} />
    <Draw way={['nw', 'o']} />
    <Draw way={['se', 'o']} />
    <Draw way={['sw', 'o']} />
  </Tikz>
);

export default Demo;
