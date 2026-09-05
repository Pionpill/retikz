import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** shadow 配置到双后端的局部管线图 */
const Demo: FC = () => (
  <Layout width={420} height={440} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="input"
      position={[0, -175]}
      text={['shadow input', 'preset | object']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="resolved"
      position={[0, -70]}
      text={['resolved shadow', 'offset / blur / color']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13, weight: 'bold' } }}
    />
    <Node
      id="scene"
      position={[-100, 45]}
      text={['Scene primitive', 'shape | path']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="svg"
      position={[-100, 165]}
      text={['SVG', 'feDropShadow']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
    />
    <Node
      id="canvas"
      position={[105, 165]}
      text={['Canvas', 'ctx.shadow*']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 13 } }}
    />
    <Node
      id="layout"
      position={[105, 45]}
      text={['auto layout', 'expanded bounds']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'lightgray', fillOpacity: 0.16, font: { size: 12 } }}
    />

    <Draw
      way={[
        'input',
        { label: { text: 'resolve', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'resolved',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'resolved',
        { label: { text: 'attach', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'scene',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'resolved',
        { label: { text: 'expand', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'layout',
      ]}
      arrow="->"
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw
      way={[
        'scene',
        { label: { text: 'render', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'svg',
      ]}
      arrow="->"
    />
    <Draw way={['scene', 'canvas']} arrow="->" />
  </Layout>
);

export default Demo;
