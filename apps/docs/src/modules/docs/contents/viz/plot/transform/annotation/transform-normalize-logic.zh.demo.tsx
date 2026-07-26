import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** normalize 的分组求和、零和保护与逐行占比写回 */
const Demo: FC = () => (
  <Layout width={420} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[70, -140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输入明细行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[70, -70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>构造分组键</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy 复合字段
      </Text>
    </Node>
    <Node
      id="sum"
      position={[70, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>计算组内总和</Text>
      <Text fill="gray" font={{ size: 12 }}>
        有限负值报错 · 非有限值按 0
      </Text>
    </Node>
    <Node
      id="negative"
      position={[-130, 0]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>发现有限负值</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering 抛错
      </Text>
    </Node>
    <Node
      id="zero"
      position={[-130, 70]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>零和保护</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sum = 0 时输出 0
      </Text>
    </Node>
    <Node
      id="share"
      position={[70, 70]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>逐行计算占比</Text>
      <Text fill="gray" font={{ size: 12 }}>
        value / sum × scale
      </Text>
    </Node>
    <Node
      id="config"
      position={[-130, 140]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输出配置</Text>
      <Text fill="gray" font={{ size: 12 }}>
        basis · as
      </Text>
    </Node>
    <Node
      id="output"
      position={[70, 140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>写回占比字段</Text>
      <Text fill="gray" font={{ size: 12 }}>
        新字段或原位覆盖 · N → N
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'sum']} arrow="->" />
    <Draw way={['sum', 'share']} arrow="->" />
    <Draw way={['share', 'output']} arrow="->" />
    <Draw way={['sum', 'negative']} arrow="->" stroke="red" />
    <Draw way={['zero', 'share']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['config', 'share']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
