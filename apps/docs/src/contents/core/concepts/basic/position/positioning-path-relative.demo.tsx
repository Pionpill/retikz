import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={360} height={220}>
    <Path stroke="currentColor">
      <Step kind="move" to={[20, 56]} />
      <Step to={{ relative: [96, 0] }} />
      <Step to={{ relative: [96, 44] }} />
    </Path>
    <Node position={[184, 30]} stroke="none">
      relative
    </Node>
    <Path stroke="currentColor" dashPattern={[5, 3]}>
      <Step kind="move" to={[20, 144]} />
      <Step to={{ relativeAccumulate: [96, 0] }} />
      <Step to={{ relativeAccumulate: [96, 44] }} />
    </Path>
    <Node position={[184, 118]} stroke="none">
      relativeAccumulate
    </Node>
  </Layout>
);

export default Demo;
