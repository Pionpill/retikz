import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** @retikz/vanilla 把 plain spec 适配为 Core IR，再交给 Core 编译成 Scene */
const Demo: FC = () => (
  <Layout width={860} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="spec"
      position={[-360, 0]}
      text={['Plain spec', 'framework-free']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="normalize"
      position={[-215, 0]}
      text={['Vanilla adapter', 'normalizeFigureSpec']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12, weight: 'bold' }}
    />
    <Node
      id="ir"
      position={[-65, 0]}
      text={['Core IR', 'JSON contract']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="compile"
      position={[75, 0]}
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
      position={[220, 0]}
      text={['Scene', 'backend-neutral']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />
    <Node
      id="output"
      position={[365, 0]}
      text={['SVG / Canvas', 'DOM or string']}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
      font={{ size: 12 }}
    />

    <Draw way={['spec', 'normalize']} arrow="->" stroke="gray" />
    <Draw way={['normalize', 'ir']} arrow="->" stroke="gray" />
    <Draw way={['ir', 'compile']} arrow="->" stroke="gray" />
    <Draw way={['compile', 'scene']} arrow="->" stroke="gray" />
    <Draw way={['scene', 'output']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
