import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** English logic figure for lowering Axes IR to Core Paths and Nodes */
const Demo: FC = () => (
  <Layout>
    <Node
      id="axes-ir"
      position={[-280, 0]}
      text={[
        { text: 'Axes IR', font: { size: 14, weight: 'bold' } },
        { text: 'origin · extents · per-axis config', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="definition"
      position={[-95, 0]}
      text={[
        { text: 'AxesDefinition', font: { size: 14, weight: 'bold' } },
        { text: 'recognizes standard.axes', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="lowering"
      position={[95, 0]}
      text={[
        { text: 'lowering', font: { size: 14, weight: 'bold' } },
        { text: 'direction mapping · lattice · assembly', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />
    <Node
      id="core-ir"
      position={[285, 0]}
      text={[
        { text: 'Core IR[]', font: { size: 14, weight: 'bold' } },
        { text: 'Path[] + Node[]', fill: 'gray', font: { size: 12 } },
      ]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ padding: 8 }}
    />

    <Draw way={['axes-ir', 'definition']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['definition', 'lowering']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['lowering', 'core-ir']} arrow="->" style={{ stroke: 'gray' }} />
  </Layout>
);

export default Demo;
