import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** value 与 content payload 进入同序 PresentedTableModel 的两条路径 */
const Demo: FC = () => (
  <Layout width={620} height={138} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="value"
      position={[-245, -36]}
      minimumSize={{ width: 140, height: 42 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>value payload</Text>
      <Text fill="gray" font={{ size: 10 }}>
        string · number · boolean
      </Text>
    </Node>
    <Node
      id="content"
      position={[-245, 36]}
      minimumSize={{ width: 140, height: 42 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>content payload</Text>
      <Text fill="gray" font={{ size: 10 }}>
        text · node · composite
      </Text>
    </Node>
    <Node
      id="registry"
      position={[-55, -36]}
      minimumSize={{ width: 132, height: 46 }}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Presentation registry</Text>
      <Text fill="gray" font={{ size: 10 }}>
        options + present()
      </Text>
    </Node>
    <Node
      id="guard"
      position={[-55, 36]}
      minimumSize={{ width: 132, height: 46 }}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Core child guard</Text>
      <Text fill="gray" font={{ size: 10 }}>
        JSON-safe IRChild
      </Text>
    </Node>
    <Node
      id="presented"
      position={[185, 0]}
      minimumSize={{ width: 156, height: 54 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={15}
    >
      <Text font={{ size: 13, weight: 'bold' }}>PresentedTableModel</Text>
      <Text fill="gray" font={{ size: 10 }}>
        same Cell identity
      </Text>
    </Node>

    <Draw way={['value', 'registry']} arrow="->" />
    <Draw way={['content', 'guard']} arrow="->" />
    <Draw way={['registry', 'presented']} arrow="->" />
    <Draw way={['guard', 'presented']} arrow="->" />
  </Layout>
);

export default Demo;
