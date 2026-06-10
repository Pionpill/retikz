import { Layout, Node, Path, Step, drawOn } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={260} height={120}>
    <Node id="a" position={[0, 0]}>a</Node>
    <Node id="b" position={[160, 60]}>b</Node>
    <Path stroke="#10b981" strokeWidth={3} animations={[drawOn()]}>
      <Step kind="move" to="a" />
      <Step kind="line" to={[80, 0]} />
      <Step kind="line" to="b" />
    </Path>
  </Layout>
);

export default Demo;
