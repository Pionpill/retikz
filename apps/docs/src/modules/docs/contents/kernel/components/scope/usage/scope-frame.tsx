import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/** 内容与独立图案外框 */
const ScopeFrameDemo: FC = () => (
  <Layout>
    <Scope
      frame={{
        padding: 16,
        style: {
          fill: { kind: 'pattern', shape: 'dots', color: 'lightskyblue', size: 8 },
          stroke: 'steelblue',
          shadow: 'sm',
        },
      }}
    >
      <Node position={[0, 0]} style={{ fill: 'white', stroke: 'steelblue' }}>
        A
      </Node>
      <Node position={[90, 0]} style={{ fill: 'white', stroke: 'steelblue' }}>
        B
      </Node>
    </Scope>
  </Layout>
);
export default ScopeFrameDemo;
