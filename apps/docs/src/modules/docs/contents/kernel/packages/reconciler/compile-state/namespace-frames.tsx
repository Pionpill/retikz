import { Draw, Layout } from '@retikz/react';
import { Map, Stack } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 展示三层名称帧，展开栈顶和栈底的同名绑定 */
const NamespaceFrames: FC = () => (
  <Layout style={{ maxWidth: '100%', height: 'auto' }}>
    <Stack
      position={[0, 0]}
      label={{ text: 'frameStack', position: 'bottom' }}
      layout={{ direction: 'up', gap: 8 }}
      padding={4}
      arrow
      defaultCell={{ layout: { width: 154, height: 32 }, style: { font: { size: 13 } } }}
      items={[
        { content: 'frame[0] · bottom', id: 'root-frame' },
        { content: 'frame[1] · B' },
        { content: 'frame[2] · top', id: 'local-frame' },
      ]}
    />
    <Map
      position={[222, 84]}
      label={{ text: 'frame[0].entryMap', position: 'bottom' }}
      defaultCell={{
        layout: { height: 32 },
        style: { font: { size: 13 } },
        key: { layout: { width: 50 } },
        value: { layout: { width: 160 } },
      }}
      entries={[{ key: { content: 'A', id: 'root-a' }, value: { content: 'root geometry' } }]}
    />
    <Map
      position={[222, 4]}
      label={{ text: 'frame[2].entryMap', position: 'bottom' }}
      defaultCell={{
        layout: { height: 32 },
        style: { font: { size: 13 } },
        key: { layout: { width: 50 } },
        value: { layout: { width: 160 } },
      }}
      entries={[{ key: { content: 'A', id: 'local-a' }, value: { content: 'center: [110, 5]' } }]}
    />
    <Draw way={['root-frame.right', 'root-a.left']} arrow="->" />
    <Draw way={['local-frame.right', 'local-a.left']} arrow="->" />
  </Layout>
);
export default NamespaceFrames;
