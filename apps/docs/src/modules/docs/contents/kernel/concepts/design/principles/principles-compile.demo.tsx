import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Core 从 IR 到 Scene 的完整编译流程 */
const Demo: FC = () => (
  <Layout width={720} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="ir"
      position={[-330, 30]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      IR
    </Node>
    <Node
      id="lower"
      position={[-220, 30]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      composite lowering
    </Node>
    <Node
      id="layout"
      position={[-50, 30]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      node / scope layout
    </Node>
    <Node
      id="paths"
      position={[155, 30]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      path resolution
    </Node>
    <Node
      id="scene"
      position={[295, 30]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Scene assembly
    </Node>
    <Node
      id="context"
      position={[-40, -50]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'compile-local context\nregistries + services'}
    </Node>

    <Draw way={['ir', 'lower']} arrow="->" />
    <Draw way={['lower', 'layout']} arrow="->" />
    <Draw
      way={[
        'layout',
        { label: { text: 'anchors', side: 'bottom', sloped: false, textColor: 'gray', font: { size: 12 } } },
        'paths',
      ]}
      arrow="->"
    />
    <Draw way={['paths', 'scene']} arrow="->" />
    <Draw way={['context', 'lower']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['context', 'layout']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['context', 'paths']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['context', 'scene']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
