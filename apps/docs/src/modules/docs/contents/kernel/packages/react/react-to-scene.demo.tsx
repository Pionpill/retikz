import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** @retikz/react 把 JSX 适配为 Core IR，再交给 Core 编译成 Scene 的职责链 */
const Demo: FC = () => (
  <Layout width={780} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="jsx"
      position={[-320, 0]}
      text={['Kernel / Sugar JSX', 'React children']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="builder"
      position={[-155, 0]}
      text={['React builder', 'buildIRWithContributions']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12, weight: 'bold' }}
    />
    <Node
      id="ir"
      position={[15, 0]}
      text={['IRScene', 'JSON contract']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="compile"
      position={[170, 0]}
      text={['Core compiler', 'compileToScene']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="scene"
      position={[320, 0]}
      text={['Scene', 'renderer-agnostic']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />

    <Draw way={['jsx', 'builder']} arrow="->" stroke="gray" />
    <Draw way={['builder', 'ir']} arrow="->" stroke="gray" />
    <Draw way={['ir', 'compile']} arrow="->" stroke="gray" />
    <Draw way={['compile', 'scene']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
