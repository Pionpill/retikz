import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

/** 用固定尺寸的两个节点追踪声明、编译与渲染 */
const PipelineExample: FC = () => (
  <Layout runtime={{ mode: 'static' }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="A"
      position={[0, 0]}
      shape="rectangle"
      layout={{ minimumSize: { width: 60, height: 40 }, padding: 0, margin: 0 }}
      style={{ stroke: 'currentColor', fill: 'none' }}
    >
      A
    </Node>
    <Node
      id="B"
      position={[180, 0]}
      shape="rectangle"
      layout={{ minimumSize: { width: 60, height: 40 }, padding: 0, margin: 0 }}
      style={{ stroke: 'currentColor', fill: 'none' }}
    >
      B
    </Node>
    <Path>
      <Step kind="move" to={{ id: 'A' }} />
      <Step to={{ id: 'B' }} />
    </Path>
  </Layout>
);

export default PipelineExample;
