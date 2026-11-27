import { Layout } from '@retikz/react';
import { Tree } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 根和 Scope 的直接子项按声明顺序从左向右排列 */
const EntryStructure: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Tree
      defaultNode={{ shape: { type: 'rectangle', params: { cornerRadius: 5 } }, layout: { padding: { x: 12, y: 4 } } }}
      root={{ content: 'root', children: [{ content: 'Scope S', children: ['Node A', 'Node B'] }, 'Path A–B'] }}
    />
  </Layout>
);
export default EntryStructure;
