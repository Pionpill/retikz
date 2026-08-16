import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Clip operations and ClipShapes converge through two registries into one Scene path */
const Demo: FC = () => (
  <Layout width={900} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="operations"
      position={[-360, -55]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      Clip Definitions
    </Node>
    <Node
      id="clip-registry"
      position={[-185, -55]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      Clip Registry
    </Node>
    <Node id="resolve" position={[-15, -55]} stroke="dimgray" fill="dimgray" fillOpacity={0.08} cornerRadius={4}>
      schema + resolve
    </Node>
    <Node
      id="shape-key"
      position={[140, -55]}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      ClipShape.kind
    </Node>
    <Node id="shapes" position={[-185, 55]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      ClipShape Definitions
    </Node>
    <Node
      id="shape-registry"
      position={[30, 55]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      ClipShape Registry
    </Node>
    <Node id="lower" position={[235, 55]} stroke="dimgray" fill="dimgray" fillOpacity={0.08} cornerRadius={4}>
      schema + lower
    </Node>
    <Node id="path" position={[390, 55]} stroke="darkviolet" fill="darkviolet" fillOpacity={0.08} cornerRadius={4}>
      SceneClipPath
    </Node>

    <Draw way={['operations', 'clip-registry', 'resolve', 'shape-key']} arrow="->" />
    <Draw way={['shapes', 'shape-registry']} arrow="->" />
    <Draw way={['shape-key', 'shape-registry']} arrow="->" />
    <Draw way={['shape-registry', 'lower', 'path']} arrow="->" />
  </Layout>
);

export default Demo;
