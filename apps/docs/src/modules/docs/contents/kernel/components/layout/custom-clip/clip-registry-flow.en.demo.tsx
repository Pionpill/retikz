import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Built-in and custom Clip Definitions share one registry and consumption path */
const Demo: FC = () => (
  <Layout width={600} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="builtins"
      position={[-245, -45]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
    >
      Built-in Definitions
    </Node>
    <Node id="custom" position={[-245, 45]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      Custom Definitions
    </Node>
    <Node
      id="registry"
      position={[-80, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ weight: 'bold' }}
    >
      Clip Registry
    </Node>
    <Node id="lookup" position={[70, 0]} stroke="dimgray" fill="dimgray" fillOpacity={0.08} cornerRadius={4}>
      clip.kind lookup
    </Node>
    <Node id="resolve" position={[210, 0]} stroke="dimgray" fill="dimgray" fillOpacity={0.08} cornerRadius={4}>
      schema + resolve
    </Node>
    <Node id="resource" position={[210, 70]} stroke="darkviolet" fill="darkviolet" fillOpacity={0.08} cornerRadius={4}>
      Scene ClipResource
    </Node>

    <Draw way={['builtins', 'registry']} arrow="->" />
    <Draw way={['custom', 'registry']} arrow="->" />
    <Draw way={['registry', 'lookup']} arrow="->" />
    <Draw way={['lookup', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'resource']} arrow="->" />
  </Layout>
);

export default Demo;
