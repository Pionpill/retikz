import { Layout, Node, grow } from '@retikz/react';
import type { FC } from 'react';

/** at={150}：把 grow（0→1，300ms）定格在 150ms ≈ 半大；静态一帧、不播放 */
const Demo: FC = () => (
  <Layout width={160} height={100} at={150}>
    <Node id="a" position={[0, 0]} fill="#10b981" animations={[grow({ duration: 300 })]}>
      at=150
    </Node>
  </Layout>
);

export default Demo;
