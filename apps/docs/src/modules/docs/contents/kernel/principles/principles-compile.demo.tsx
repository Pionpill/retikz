import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 技术原理页的 core 编译流程图 */
const Demo: FC = () => (
  <Layout width={760} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="ir"
      position={[-350, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      IR
    </Node>
    <Node
      id="lower"
      position={[-205, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      composite lowering
    </Node>
    <Node
      id="layout"
      position={[-25, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      node / scope layout
    </Node>
    <Node
      id="paths"
      position={[165, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      path resolution
    </Node>
    <Node
      id="scene"
      position={[345, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Scene assembly
    </Node>
    <Node
      id="registries"
      position={[-25, -80]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      provider registries
    </Node>

    <Draw way={['ir', 'lower']} arrow="->" />
    <Draw way={['lower', 'layout']} arrow="->" />
    <Draw
      way={[
        'layout',
        { label: { text: 'anchors', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'paths',
      ]}
      arrow="->"
    />
    <Draw way={['paths', 'scene']} arrow="->" />
    <Draw way={['registries', 'layout']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['registries', { bend: 'right', angle: 20 }, 'paths']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
