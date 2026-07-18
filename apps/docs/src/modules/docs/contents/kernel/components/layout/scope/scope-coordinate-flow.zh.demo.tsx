import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Scope 变换 lowering 与相对定位投影流程图 */
const Demo: FC = () => (
  <Layout width={680} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="ir-transforms"
      position={[-170, -45]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      7 种 IR transforms
    </Node>
    <Node
      id="scene-transforms"
      position={[10, -45]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      3 种 Scene transforms
    </Node>
    <Node
      id="scope-chain"
      position={[205, -45]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      累计 scope chain
    </Node>

    <Node
      id="referent"
      position={[-260, 30]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      全局 referent
    </Node>
    <Node
      id="inverse"
      position={[-120, 30]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      反投影到局部
    </Node>
    <Node
      id="relative"
      position={[20, 30]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      叠加 relative
    </Node>
    <Node
      id="forward"
      position={[155, 30]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      正向投影
    </Node>
    <Node
      id="global-result"
      position={[285, 30]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      全局 layout
    </Node>

    <Draw
      way={[
        'ir-transforms',
        { label: { text: 'lower', side: 'top', sloped: true, distance: 10, textColor: 'gray', font: { size: 12 } } },
        'scene-transforms',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'scene-transforms',
        { label: { text: '累积', side: 'top', sloped: true, distance: 10, textColor: 'gray', font: { size: 12 } } },
        'scope-chain',
      ]}
      arrow="->"
    />
    <Draw way={['referent', 'inverse']} arrow="->" />
    <Draw way={['inverse', 'relative']} arrow="->" />
    <Draw way={['relative', 'forward']} arrow="->" />
    <Draw way={['forward', 'global-result']} arrow="->" />
    <Draw way={['scope-chain', 'forward']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
