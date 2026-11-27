import { Draw, Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 对照路径求值前后的同一图元列表，节点产物合并展示 */
const AssemblySlots: FC = () => {
  const cell = { layout: { width: 154, height: 32 }, style: { font: { size: 13 } } };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        position={[0, 0]}
        label={{ text: 'state.primitives · queuePathChild' }}
        defaultCell={cell}
        items={[
          { content: 'PATH_PLACEHOLDER', id: 'slot' },
          { content: 'A · primitives', id: 'node-before' },
        ]}
      />
      <Array
        position={[0, 92]}
        label={{ text: 'state.primitives · assemblePaths', position: 'bottom' }}
        defaultCell={cell}
        items={[
          { content: 'path(A → C)', id: 'path-output' },
          { content: 'A · primitives', id: 'node-after' },
        ]}
      />
      <Draw way={['slot.bottom', 'path-output.top']} arrow="->" />
      <Draw way={['node-before.bottom', 'node-after.top']} arrow="->" />
    </Layout>
  );
};
export default AssemblySlots;
