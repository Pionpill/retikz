import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** React、Vanilla 与 JSON Chart 输入汇入统一 parse、recipe 和 resolve 主链 */
const Demo: FC = () => (
  <Layout width={800} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="authoring"
      position={[-315, 20]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
    >
      React / Vanilla
    </Node>
    <Node
      id="source"
      position={[-155, 20]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
    >
      Exact Chart Source
    </Node>
    <Node
      id="json"
      position={[-155, -65]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
    >
      JSON + exact schema
    </Node>
    <Node
      id="bind"
      position={[0, 20]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
    >
      chartType recipe
    </Node>
    <Node
      id="resolve"
      position={[155, 20]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'lightgray', fillOpacity: 0.16 }}
    >
      resolveChart
    </Node>
    <Node
      id="base"
      position={[315, 20]}
      cornerRadius={4}
      style={{ stroke: 'seagreen', fill: 'seagreen', fillOpacity: 0.08 }}
    >
      Resolved Chart + Plot
    </Node>

    <Draw way={['authoring', 'source']} arrow="->" />
    <Draw way={['json', 'source']} arrow="->" />
    <Draw way={['source', 'bind']} arrow="->" />
    <Draw way={['bind', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'base']} arrow="->" />
  </Layout>
);

export default Demo;
