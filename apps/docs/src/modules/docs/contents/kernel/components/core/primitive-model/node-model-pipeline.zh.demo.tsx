import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout>
    <Node id="s1" position={[-247, 0]} style={{ stroke: 'none' }}>
      position + 文本
    </Node>
    <Node id="s2" position={[-137, 0]} style={{ stroke: 'none' }}>
      内框
    </Node>
    <Node id="s3" position={[3, 0]} style={{ stroke: 'none' }}>
      外接框
    </Node>
    <Node id="s4" position={[108, 0]} style={{ stroke: 'none' }}>
      视觉轮廓
    </Node>
    <Node id="s5" position={[218, 0]} style={{ stroke: 'none' }}>
      boundary / anchor
    </Node>

    <Draw
      way={['s1', { label: { text: '度量', side: 'top', textColor: 'gray', font: { size: 12 } } }, 's2']}
      arrow="->"
    />
    <Draw
      way={['s2', { label: { text: 'circumscribe', side: 'top', textColor: 'gray', font: { size: 12 } } }, 's3']}
      arrow="->"
    />
    <Draw
      way={['s3', { label: { text: 'emit', side: 'top', textColor: 'gray', font: { size: 12 } } }, 's4']}
      arrow="->"
    />
    <Draw way={['s4', 's5']} arrow="->" />
  </Layout>
);

export default Demo;
