import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** stack 的分组、排序、边界计算与逐行写回 */
const Demo: FC = () => (
  <Layout width={680} height={150} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-270, 40]}
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
      position={[-150, 40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>按 x 分组</Text>
      <Text fill="gray" font={{ size: 12 }}>
        缺省时全行一组
      </Text>
    </Node>
    <Node
      id="order"
      position={[-20, 40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>确定系列顺序</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy 首次出现序
      </Text>
    </Node>
    <Node
      id="offset"
      position={[120, -40]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>offset 策略</Text>
      <Text fill="gray" font={{ size: 12 }}>
        normalize 仅非负 · 有符号用 diverging
      </Text>
    </Node>
    <Node
      id="bounds"
      position={[120, 40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>计算累计边界</Text>
      <Text fill="gray" font={{ size: 12 }}>
        非有限 y 按 0
      </Text>
    </Node>
    <Node
      id="output"
      position={[270, 40]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>写回 y0 / y1</Text>
      <Text fill="gray" font={{ size: 12 }}>
        保持原顺序 · N → N
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'order']} arrow="->" />
    <Draw way={['order', 'bounds']} arrow="->" />
    <Draw way={['bounds', 'output']} arrow="->" />
    <Draw way={['offset', 'bounds']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
