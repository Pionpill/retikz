import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** 同一次 Table transaction 同源生成 Scene 与 typed manifest */
const Demo: FC = () => (
  <Layout width={600} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="semantic"
      position={[-220, -46]}
      minimumSize={{ width: 142, height: 42 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Semantic model</Text>
      <Text fill="gray" font={{ size: 10 }}>
        address · optional id
      </Text>
    </Node>
    <Node
      id="layout"
      position={[-220, 46]}
      minimumSize={{ width: 142, height: 42 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Resolved layout</Text>
      <Text fill="gray" font={{ size: 10 }}>
        tracks · Cells · borders
      </Text>
    </Node>
    <Node
      id="transaction"
      position={[0, 0]}
      minimumSize={{ width: 132, height: 52 }}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      align="middle"
      lineHeight={15}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Table transaction</Text>
      <Text fill="gray" font={{ size: 10 }}>
        one Core compile
      </Text>
    </Node>
    <Node
      id="scene"
      position={[220, -46]}
      minimumSize={{ width: 136, height: 42 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Scene</Text>
      <Text fill="gray" font={{ size: 10 }}>
        renderer input
      </Text>
    </Node>
    <Node
      id="manifest"
      position={[220, 46]}
      minimumSize={{ width: 136, height: 42 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={14}
    >
      <Text font={{ size: 13, weight: 'bold' }}>Manifest</Text>
      <Text fill="gray" font={{ size: 10 }}>
        host artifact
      </Text>
    </Node>

    <Draw way={['semantic', 'transaction']} arrow="->" />
    <Draw way={['layout', 'transaction']} arrow="->" />
    <Draw way={['transaction', 'scene']} arrow="->" />
    <Draw way={['transaction', 'manifest']} arrow="->" />
  </Layout>
);

export default Demo;
