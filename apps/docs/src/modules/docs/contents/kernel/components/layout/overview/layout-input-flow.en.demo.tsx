import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Layout 两种输入路径的归一流程图 */
const Demo: FC = () => (
  <Layout width={560} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="children"
      position={[-220, -20]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      JSX children
    </Node>
    <Node
      id="root-scope"
      position={[-50, -20]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      root Scope (optional)
    </Node>
    <Node
      id="style"
      position={[-100, -125]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      figure style props
    </Node>
    <Node
      id="ir-prop"
      position={[-220, 60]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      ir prop
    </Node>
    <Node
      id="ir"
      position={[195, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 15, weight: 'bold' }}
    >
      JSON IR
    </Node>
    <Draw way={['children', 'root-scope']} arrow="->" />
    <Draw
      way={[
        'style',
        { label: { text: 'when set', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'root-scope',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw
      way={[
        'root-scope',
        { label: { text: 'convert', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'ir',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'ir-prop',
        { label: { text: 'use directly', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'ir',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
