import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={200}>
    <Node id="a" position={[80, 100]} stroke="none">
      A
    </Node>
    <Node id="b" position={[200, 100]} stroke="none">
      B
    </Node>
    <Draw way={['a', { circle: { radius: 30 } }]} />
    <Draw way={['b', { circle: { radius: 20 } }]} dashPattern={[4, 2]} />
  </Layout>
);

export default Demo;
