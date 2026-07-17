import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Text 与 Node 文本输入归一流程图 */
const Demo: FC = () => (
  <Layout width={600} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="text-prop"
      position={[-225, -40]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      text prop
    </Node>
    <Node
      id="plain-child"
      position={[-225, 20]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      string / number
    </Node>
    <Node
      id="text-child"
      position={[-225, 80]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'<Text>'}
    </Node>
    <Node
      id="normalization"
      position={[0, 20]}
      text={['Node text', 'normalization']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    />
    <Node
      id="node-text"
      position={[225, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Node.text
    </Node>

    <Draw
      way={[
        'text-prop',
        { label: { text: 'priority', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'normalization',
      ]}
      arrow="->"
    />
    <Draw way={['plain-child', 'normalization']} arrow="->" />
    <Draw way={['text-child', 'normalization']} arrow="->" />
    <Draw
      way={[
        'normalization',
        { label: { text: 'ordered lines', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'node-text',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
