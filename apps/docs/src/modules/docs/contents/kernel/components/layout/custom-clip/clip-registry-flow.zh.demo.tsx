import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 完整 Clip Definition 通过单一 registry 收敛为 Scene 路径 */
const Demo: FC = () => (
  <Layout width={900} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="operations"
      position={[-360, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
    >
      Clip Definitions
    </Node>
    <Node
      id="clip-registry"
      position={[-175, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
    >
      Clip Registry
    </Node>
    <Node
      id="resolve"
      position={[20, 0]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.08 }}
    >
      schema + resolve
    </Node>
    <Node
      id="lower"
      position={[225, 0]}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.08 }}
    >
      shapeSchema + lower
    </Node>
    <Node
      id="path"
      position={[395, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.08 }}
    >
      SceneClipPath
    </Node>

    <Draw way={['operations', 'clip-registry', 'resolve', 'lower', 'path']} arrow="->" />
  </Layout>
);

export default Demo;
