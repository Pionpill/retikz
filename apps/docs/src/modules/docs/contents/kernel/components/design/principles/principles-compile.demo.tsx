import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/** Core 从 IR 到 Scene 的完整编译流程 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="ir"
      position={[-330, 30]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 14, weight: 'bold' }, opacity: { fill: 0.08 } }}
    >
      IR
    </Node>
    <Node
      id="lower"
      position={[-220, 30]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', font: { size: 13 }, opacity: { fill: 0.08 } }}
    >
      composite lowering
    </Node>
    <Node
      id="layout"
      position={[-50, 30]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', font: { size: 13 }, opacity: { fill: 0.08 } }}
    >
      node / scope layout
    </Node>
    <Node
      id="paths"
      position={[155, 30]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', font: { size: 13 }, opacity: { fill: 0.08 } }}
    >
      path resolution
    </Node>
    <Node
      id="scene"
      position={[295, 30]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', font: { size: 14, weight: 'bold' }, opacity: { fill: 0.08 } }}
    >
      Scene assembly
    </Node>
    <Node
      id="context"
      position={[-40, -50]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', font: { size: 12 }, opacity: { fill: 0.08 } }}
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
    <Draw way={['context', 'lower']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['context', 'layout']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['context', 'paths']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['context', 'scene']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
  </Layout>
);

export default Demo;
