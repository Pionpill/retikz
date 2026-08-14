import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** @retikz/react 把 JSX 收集为 Vanilla Input，再由 processing 产出 Scene 的职责链 */
const Demo: FC = () => (
  <Layout width={860} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="jsx"
      position={[-350, 0]}
      text={['Kernel / Sugar JSX', 'React children']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="input"
      position={[-175, 0]}
      text={['React collector', 'createInputScene']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12, weight: 'bold' }}
    />
    <Node
      id="input-scene"
      position={[0, 0]}
      text={['InputScene', 'typed authoring']}
      stroke="mediumseagreen"
      fill="mediumseagreen"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="processing"
      position={[185, 0]}
      text={['Vanilla processing', 'normalize + compile']}
      stroke="mediumseagreen"
      fill="mediumseagreen"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="scene"
      position={[370, 0]}
      text={['Scene', 'renderer-agnostic']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />

    <Draw way={['jsx', 'input']} arrow="->" stroke="gray" />
    <Draw way={['input', 'input-scene']} arrow="->" stroke="gray" />
    <Draw way={['input-scene', 'processing']} arrow="->" stroke="gray" />
    <Draw way={['processing', 'scene']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
