import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Scope 样式逐字段回退与 resetStyle 屏障图 */
const Demo: FC = () => (
  <Layout width={680} height={140} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="element"
      position={[-285, 25]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      field / color
    </Node>
    <Node
      id="typed-default"
      position={[-170, 25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      typed default
    </Node>
    <Node
      id="scope-cascade"
      position={[-55, 25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      Scope cascade
    </Node>
    <Node
      id="outer-frames"
      position={[70, 25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      outer frames
    </Node>
    <Node
      id="builtin"
      position={[190, 25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      built-in
    </Node>
    <Node
      id="resolved"
      position={[295, 25]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      resolved value
    </Node>
    <Node
      id="reset"
      position={[70, -35]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      resetStyle · cuts outer
    </Node>

    <Draw way={['element', 'typed-default']} arrow="->" />
    <Draw way={['typed-default', 'scope-cascade']} arrow="->" />
    <Draw way={['scope-cascade', 'outer-frames']} arrow="->" />
    <Draw way={['outer-frames', 'builtin']} arrow="->" />
    <Draw way={['builtin', 'resolved']} arrow="->" />
    <Draw way={['reset', 'outer-frames']} arrow="->" stroke="darkorange" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
