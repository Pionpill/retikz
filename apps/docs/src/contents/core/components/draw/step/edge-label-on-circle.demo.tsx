import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={300}>
    <Node id="center" position={[150, 150]} stroke="none">
      ·
    </Node>
    {/* circlePath：t=0 在 angle 0（+x），CCW 增长；0.25→90°(下) 0.5→180°(-x) 0.75→270°(上) */}
    <Path stroke="currentColor">
      <Step kind="move" to="center" />
      <Step
        kind="circlePath"
        radius={100}
        label={{ text: 't=0.25', position: 0.25, side: 'below' }}
      />
    </Path>
    <Path stroke="currentColor" dashPattern={[3, 3]}>
      <Step kind="move" to="center" />
      <Step
        kind="circlePath"
        radius={100}
        label={{ text: 'midway (180°)', position: 'midway' }}
      />
    </Path>
  </Layout>
);

export default Demo;
