import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={400} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="center" position={[200, 100]} stroke="none">
      ·
    </Node>
    {/* ellipsePath：与 circlePath 同样角度参数化；rx≠ry 时 t=0.5 仍在 angle 180°（不是弧长中点） */}
    <Path stroke="currentColor">
      <Step kind="move" to="center" />
      <Step
        kind="ellipsePath"
        radiusX={170}
        radiusY={70}
        label={{ text: 't=0.25', position: 0.25, side: 'below' }}
      />
    </Path>
  </Layout>
);

export default Demo;
