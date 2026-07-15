import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 技术原理页的 define-registry 闭环图 */
const Demo: FC = () => (
  <Layout width={720} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="input"
      position={[-290, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      DefinitionInput
    </Node>
    <Node
      id="define"
      position={[-150, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      defineXxx
    </Node>
    <Node
      id="definitions"
      position={[-5, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      builtin + custom
    </Node>
    <Node
      id="registry"
      position={[150, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Registry Map
    </Node>
    <Node
      id="consumer"
      position={[295, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      compile consumer
    </Node>
    <Node
      id="ir-key"
      position={[295, -72]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      IR name / type / kind
    </Node>

    <Draw way={['input', 'define']} arrow="->" />
    <Draw way={['define', 'definitions']} arrow="->" />
    <Draw
      way={[
        'definitions',
        { label: { text: 'resolve', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'registry',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'registry',
        { label: { text: 'lookup', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'consumer',
      ]}
      arrow="->"
    />
    <Draw way={['ir-key', 'consumer']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
