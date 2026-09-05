import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Unified compilation path from Standard Definitions to the Scene */
const Demo: FC = () => (
  <Layout width={700} height={120} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="definitions"
      position={[-250, 0]}
      text={['Standard Definition', 'individual or complete set']}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="assembly"
      position={[-90, 0]}
      text={['Assembly entry', 'options / providers']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13, weight: 'bold' } }}
    />
    <Node
      id="registry"
      position={[60, 0]}
      text={['Core resolver', 'one registry']}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="lookup"
      position={[180, 0]}
      text={['IR reference', 'lookup by name']}
      cornerRadius={4}
      style={{ stroke: 'dimgray', fill: 'dimgray', fillOpacity: 0.08, font: { size: 13 } }}
    />
    <Node
      id="scene"
      position={[290, 0]}
      text={['Scene', 'compile result']}
      cornerRadius={4}
      style={{ stroke: 'darkviolet', fill: 'darkviolet', fillOpacity: 0.08, font: { size: 13 } }}
    />

    <Draw way={['definitions', 'assembly']} arrow="->" />
    <Draw way={['assembly', 'registry']} arrow="->" />
    <Draw way={['registry', 'lookup']} arrow="->" />
    <Draw way={['lookup', 'scene']} arrow="->" />
  </Layout>
);

export default Demo;
