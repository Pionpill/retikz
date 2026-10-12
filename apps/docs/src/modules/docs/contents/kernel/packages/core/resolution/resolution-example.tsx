import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/** 展示同一作用域中节点与路径的配置解析 */
const ResolutionExample: FC = () => (
  <Layout theme={{ mode: 'light' }}>
    <Scope
      defaults={{
        style: { color: '#204060', strokeWidth: 1 },
        path: { style: { stroke: 0.5, strokeWidth: 2 } },
        node: {
          shape: 'rectangle',
          style: { fill: 0.5, strokeWidth: 2, textColor: '#ffffff' },
          layout: { minimumSize: { width: 100, height: 48 } },
        },
      }}
    >
      <Node id="A" position={[0, 0]} style={{ strokeWidth: 3 }}>
        A
      </Node>
      <Path id="P" style={{ strokeWidth: 3 }}>
        <Step kind="move" to={[-40, 44]} />
        <Step kind="line" to={[40, 44]} />
      </Path>
    </Scope>
  </Layout>
);

export default ResolutionExample;
