import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** English logic figure for lowering Axes IR to Core Paths and Nodes */
const Demo: FC = () => (
  <Layout width={760} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="axes-ir"
      position={[-280, 0]}
      text={[
        { text: 'Axes IR', font: { size: 14, weight: 'bold' } },
        { text: 'origin · extents · per-axis config', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="definition"
      position={[-95, 0]}
      text={[
        { text: 'AxesDefinition', font: { size: 14, weight: 'bold' } },
        { text: 'recognizes standard.axes', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="lowering"
      position={[95, 0]}
      text={[
        { text: 'lowering', font: { size: 14, weight: 'bold' } },
        { text: 'direction mapping · lattice · assembly', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="core-ir"
      position={[285, 0]}
      text={[
        { text: 'Core IR[]', font: { size: 14, weight: 'bold' } },
        { text: 'Path[] + Node[]', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />

    <Draw way={['axes-ir', 'definition']} arrow="->" stroke="gray" />
    <Draw way={['definition', 'lowering']} arrow="->" stroke="gray" />
    <Draw way={['lowering', 'core-ir']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
