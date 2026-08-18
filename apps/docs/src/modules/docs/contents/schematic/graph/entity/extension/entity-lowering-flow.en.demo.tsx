import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Entity execution flow from Graph IR to Kernel IR */
const Demo: FC = () => (
  <Layout width={840} height={140} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="ir"
      position={[-330, 0]}
      minimumSize={{ width: 140, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={['Graph Entity IR', 'role · variant · tokens']}
    />
    <Node
      id="registry"
      position={[-165, 0]}
      minimumSize={{ width: 140, height: 46 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={['Definition registry', 'built-in · custom']}
    />
    <Node
      id="resolve"
      position={[0, 0]}
      minimumSize={{ width: 140, height: 46 }}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      textColor="currentColor"
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
      text={['Resolution', 'Theme · role · variant']}
    />
    <Node
      id="lower"
      position={[165, 0]}
      minimumSize={{ width: 140, height: 46 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={['Lowering', 'Scope · Node']}
    />
    <Node
      id="kernel"
      position={[330, 0]}
      minimumSize={{ width: 140, height: 46 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
      text={['Kernel IR', 'renderable result']}
    />

    <Draw way={['ir', 'registry']} arrow="->" />
    <Draw way={['registry', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'lower']} arrow="->" />
    <Draw way={['lower', 'kernel']} arrow="->" />
  </Layout>
);

export default Demo;
