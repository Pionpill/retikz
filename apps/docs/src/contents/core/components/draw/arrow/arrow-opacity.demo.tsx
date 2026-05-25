import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 半透明箭头：opacity 单独作用于 marker，不影响 path stroke
 * @description path 实色描边、marker 0.5 opacity 视觉对照（区分于 path 整体 opacity）
 */
const Demo: FC = () => (
  <Layout width={320} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[260, 0]}>
      B
    </Node>
    <Path
      arrow="->"
      arrowDetail={{ shape: 'stealth', opacity: 0.5, color: 'red' }}
      stroke="gray"
      strokeWidth={2}
    >
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
    </Path>
  </Layout>
);

export default Demo;
