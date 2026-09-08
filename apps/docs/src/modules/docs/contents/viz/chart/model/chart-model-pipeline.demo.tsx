import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Chart 从 Source 经 recipe 进入 Plot 与 Surface */
const Demo: FC = () => (
  <Layout width={760} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="authoring"
      position={[-300, 0]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
    >
      React / Vanilla
    </Node>
    <Node
      id="source"
      position={[-150, 0]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
    >
      Exact Chart Source
    </Node>
    <Node
      id="bound"
      position={[0, 0]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
    >
      Parse + recipe
    </Node>
    <Node
      id="base"
      position={[150, 0]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
    >
      Chart marks
    </Node>
    <Node
      id="output"
      position={[305, 0]}
      cornerRadius={4}
      style={{ stroke: 'seagreen', fill: 'seagreen', fillOpacity: 0.08 }}
    >
      Plot + Surface
    </Node>

    <Draw way={['authoring', 'source']} arrow="->" />
    <Draw way={['source', 'bound']} arrow="->" />
    <Draw way={['bound', 'base']} arrow="->" />
    <Draw way={['base', 'output']} arrow="->" />
  </Layout>
);

export default Demo;
