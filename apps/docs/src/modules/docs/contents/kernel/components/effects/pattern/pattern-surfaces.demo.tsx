import type { IRPaint } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

const pattern = {
  kind: 'pattern',
  shape: 'grid',
  color: '#7c3aed',
  background: '#f5f3ff',
  size: 12,
  rotation: 20,
} satisfies IRPaint;

/** 同一份图案规格既可填充 Node，也可填充闭合 Path */
const Demo: FC = () => (
  <Layout width={320} height={160} viewBox={{ x: -160, y: -80, width: 320, height: 160 }}>
    <Node position={[-82, 0]} shape="circle" minimumSize={96} fill={pattern} stroke="#7c3aed" textColor="#4c1d95">
      Node
    </Node>
    <Path fill={pattern} stroke="#7c3aed">
      <Step kind="move" to={[35, 48]} />
      <Step kind="line" to={[82, -52]} />
      <Step kind="line" to={[132, 48]} />
      <Step kind="cycle" />
    </Path>
  </Layout>
);

export default Demo;
