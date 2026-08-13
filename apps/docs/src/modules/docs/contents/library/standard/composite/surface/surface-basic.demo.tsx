import type { FC } from 'react';

import { Draw, Layout, Node, Scope } from '@retikz/react';
import { Surface } from '@retikz/standard-react';

/** Surface 包装任意单个 Core child 的基础示例 */
const Demo: FC = () => (
  <Layout width={460} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Surface
      id="provider-surface"
      padding={{ x: 22, y: 16 }}
      background={{ fill: '#f8fafc' }}
      border={{ stroke: '#64748b', strokeWidth: 1.5 }}
      cornerRadius={12}
    >
      <Scope>
        <Node id="provider" position={[-90, 0]} text="Provider" fill="#dbeafe" stroke="#2563eb" />
        <Node id="definition" position={[90, 0]} text="Definition" fill="#dcfce7" stroke="#16a34a" />
        <Draw way={['provider', 'definition']} arrow="->" stroke="#64748b" />
      </Scope>
    </Surface>
  </Layout>
);

export default Demo;
