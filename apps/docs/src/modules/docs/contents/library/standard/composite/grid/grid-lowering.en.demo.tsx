import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Grid IR 下沉为 Core Path 的英文逻辑图 */
const Demo: FC = () => (
  <Layout width={760} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="grid-ir"
      position={[-310, 0]}
      text={[
        { text: 'Grid IR', font: { size: 14, weight: 'bold' } },
        { text: 'bounds · line · position', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="normalize"
      position={[-160, 0]}
      text={[
        { text: 'Normalize input', font: { size: 14, weight: 'bold' } },
        { text: 'sort corners · local center', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="lattice"
      position={[0, 0]}
      text={[
        { text: 'Enumerate lattice', font: { size: 14, weight: 'bold' } },
        { text: 'x / y values and indices', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="assemble"
      position={[165, 0]}
      text={[
        { text: 'Classify and assemble', font: { size: 14, weight: 'bold' } },
        { text: 'line · major · border', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />
    <Node
      id="paths"
      position={[315, 0]}
      text={[
        { text: 'Core Path[] / Scope', font: { size: 14, weight: 'bold' } },
        { text: 'Core resolves center position', fill: 'gray', font: { size: 12 } },
      ]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      padding={8}
    />

    <Draw way={['grid-ir', 'normalize']} arrow="->" stroke="gray" />
    <Draw way={['normalize', 'lattice']} arrow="->" stroke="gray" />
    <Draw way={['lattice', 'assemble']} arrow="->" stroke="gray" />
    <Draw way={['assemble', 'paths']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
