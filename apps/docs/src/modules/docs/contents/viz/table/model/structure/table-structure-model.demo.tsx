import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 以同一视觉层级呈现一种 Structure 输入 */
const structureInput = (id: string, y: number, title: string, detail: string) => (
  <Node
    id={id}
    position={[-220, y]}
    minimumSize={{ width: 116, height: 42 }}
    stroke="darkorange"
    fill="darkorange"
    fillOpacity={0.08}
    cornerRadius={4}
    align="middle"
    lineHeight={14}
  >
    <Text font={{ size: 13, weight: 'bold' }}>{title}</Text>
    <Text fill="gray" font={{ size: 10 }}>
      {detail}
    </Text>
  </Node>
);

/** detail、manual 与 custom Structure 收敛为同一个 canonical model */
const Demo: FC = () => (
  <Layout width={580} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    {structureInput('detail', -62, 'detail', 'records + fields')}
    {structureInput('manual', 0, 'manual', 'explicit grid')}
    {structureInput('custom', 62, 'custom', 'domain options')}

    <Node
      id="registry"
      position={[-45, 0]}
      minimumSize={{ width: 128, height: 50 }}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      align="middle"
      lineHeight={15}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Structure registry</Text>
      <Text fill="gray" font={{ size: 10 }}>
        schema + Definition
      </Text>
    </Node>

    <Node
      id="semantic"
      position={[155, 0]}
      minimumSize={{ width: 158, height: 58 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 13, weight: 'bold' }}>SemanticTableModel</Text>
      <Text fill="gray" font={{ size: 10 }}>
        rows · columns · Cells
      </Text>
    </Node>

    <Draw way={['detail', 'registry']} arrow="->" />
    <Draw way={['manual', 'registry']} arrow="->" />
    <Draw way={['custom', 'registry']} arrow="->" />
    <Draw
      way={[
        'registry',
        {
          label: {
            text: 'normalize',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 11 },
          },
        },
        'semantic',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
