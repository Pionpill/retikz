import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 技术原理页的全链路总览图 */
const Demo: FC = () => (
  <Layout width={720} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="authoring"
      position={[-285, -46]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      React / Vanilla
    </Node>
    <Node
      id="external-ir"
      position={[-285, 46]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      AI / persistence
    </Node>

    <Node
      id="ir"
      position={[-125, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      IR (JSON)
    </Node>
    <Node
      id="compiler"
      position={[40, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Core compiler
    </Node>
    <Node
      id="scene"
      position={[175, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      Scene
    </Node>
    <Node
      id="renderers"
      position={[310, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      SVG / Canvas
    </Node>

    <Draw
      way={[
        'authoring',
        { label: { text: 'normalize', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'ir',
      ]}
      arrow="->"
    />
    <Draw way={['external-ir', 'ir']} arrow="<->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'ir',
        { label: { text: 'compile', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'compiler',
      ]}
      arrow="->"
    />
    <Draw way={['compiler', 'scene']} arrow="->" />
    <Draw
      way={[
        'scene',
        { label: { text: 'render', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'renderers',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
