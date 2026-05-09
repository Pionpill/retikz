import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={460} height={140}>
    <Node id="center" position={[-150, 0]} text={['User', 'Service', 'v2.1']} />
    <Node id="left" position={[0, 0]} align="left" text={['Step 1: read', 'Step 2: parse', 'Step 3: emit']} />
    <Node id="right" position={[160, 0]} align="right" text={['short', 'longer line', 'mid']} />
  </Tikz>
);

export default Demo;
