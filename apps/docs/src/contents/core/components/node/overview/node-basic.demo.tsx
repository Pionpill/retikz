import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={200} height={80}>
    <Node id="a" position={[0, 0]}>
      Hello
    </Node>
  </Tikz>
);

export default Demo;
