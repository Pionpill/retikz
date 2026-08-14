import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Standard Definition 从装载到 Scene 的统一编译路径 */
const Demo: FC = () => (
  <Layout width={700} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="definitions"
      position={[-250, 0]}
      text={['Standard Definition', '单个或完整集合']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="assembly"
      position={[-90, 0]}
      text={['装载入口', 'options / providers']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    />
    <Node
      id="registry"
      position={[60, 0]}
      text={['Core resolver', '统一 registry']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="lookup"
      position={[180, 0]}
      text={['IR 引用', '按名称查找']}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="scene"
      position={[290, 0]}
      text={['Scene', '编译结果']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />

    <Draw way={['definitions', 'assembly']} arrow="->" />
    <Draw way={['assembly', 'registry']} arrow="->" />
    <Draw way={['registry', 'lookup']} arrow="->" />
    <Draw way={['lookup', 'scene']} arrow="->" />
  </Layout>
);

export default Demo;
