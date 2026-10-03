import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Surface } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** Surface 包装任意单个 Core child 的基础示例 */
const Demo: FC = () => (
  <Layout>
    <Surface
      id="provider-surface"
      padding={{ x: 22, y: 16 }}
      background={{ fill: 'currentColor', fillOpacity: 0.04 }}
      border={{ stroke: 'gray', strokeWidth: 1 }}
      cornerRadius={12}
    >
      <Scope>
        <Node
          id="provider"
          position={[-90, 0]}
          text="Provider"
          style={{ fill: 'dodgerblue', fillOpacity: 0.12, stroke: 'dodgerblue' }}
        />
        <Node
          id="definition"
          position={[90, 0]}
          text="Definition"
          style={{ fill: 'dodgerblue', fillOpacity: 0.12, stroke: 'dodgerblue' }}
        />
        <Draw way={['provider', 'definition']} arrow="->" style={{ stroke: 'gray' }} />
      </Scope>
    </Surface>
  </Layout>
);

export default Demo;
