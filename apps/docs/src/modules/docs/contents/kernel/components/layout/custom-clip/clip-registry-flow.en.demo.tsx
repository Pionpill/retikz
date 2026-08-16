import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** One complete Clip Definition converges through one registry into a Scene path */
const Demo: FC = () => (
  <Layout width={900} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="operations"
      position={[-360, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      Clip Definitions
    </Node>
    <Node
      id="clip-registry"
      position={[-175, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      Clip Registry
    </Node>
    <Node id="resolve" position={[20, 0]} stroke="dimgray" fill="dimgray" fillOpacity={0.08} cornerRadius={4}>
      schema + resolve
    </Node>
    <Node id="lower" position={[225, 0]} stroke="dimgray" fill="dimgray" fillOpacity={0.08} cornerRadius={4}>
      shapeSchema + lower
    </Node>
    <Node id="path" position={[395, 0]} stroke="darkviolet" fill="darkviolet" fillOpacity={0.08} cornerRadius={4}>
      SceneClipPath
    </Node>

    <Draw way={['operations', 'clip-registry', 'resolve', 'lower', 'path']} arrow="->" />
  </Layout>
);

export default Demo;
