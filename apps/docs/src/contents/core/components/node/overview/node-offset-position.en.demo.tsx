import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Node `offset` for arbitrary (dx, dy) relative positioning
 * @description A's position = B + (80, 50). `{ of, offset }` makes "offset from a named node" a first-class expression — no hand-rolled atan2 / hypot.
 */
const Demo: FC = () => (
  <Layout width={320} height={180}>
    <Node id="B" position={[0, 0]}>b</Node>
    <Node id="A" position={{ of: 'B', offset: [80, 50] }}>a</Node>
    <Draw way={['B', 'A']} arrow="->" />
  </Layout>
);

export default Demo;
