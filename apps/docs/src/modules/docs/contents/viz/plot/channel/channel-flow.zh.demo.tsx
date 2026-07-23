import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 通道绑定与 definition 汇入统一解析器的插图
 * @description PlotSpec 的位置绑定由坐标角色读取，其余绑定与内置 / 自定义 definition 在解析器处汇合
 */
const Demo: FC = () => (
  <Layout width={440} height={360} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="binding"
      position={[-145, -105]}
      minimumSize={{ width: 118, height: 54 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>PlotSpec 绑定</Text>
      <Text fill="gray" font={{ size: 12 }}>
        字段 / 常量
      </Text>
    </Node>
    <Node
      id="builtin"
      position={[0, -105]}
      minimumSize={{ width: 118, height: 54 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>内置 definition</Text>
      <Text fill="gray" font={{ size: 12 }}>
        内置通道
      </Text>
    </Node>
    <Node
      id="custom"
      position={[145, -105]}
      minimumSize={{ width: 118, height: 54 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>自定义 definition</Text>
      <Text fill="gray" font={{ size: 12 }}>
        channelDefinitions
      </Text>
    </Node>
    <Node
      id="registry"
      position={[72, -25]}
      minimumSize={{ width: 132, height: 54 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Channel registry</Text>
      <Text fill="gray" font={{ size: 12 }}>
        按通道名合并
      </Text>
    </Node>
    <Node
      id="resolver"
      position={[72, 55]}
      minimumSize={{ width: 132, height: 54 }}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.07}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>解析绑定</Text>
      <Text fill="gray" font={{ size: 11 }}>
        按 definition kind 分派
      </Text>
    </Node>
    <Node
      id="position"
      position={[-145, 55]}
      minimumSize={{ width: 118, height: 54 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>位置绑定</Text>
      <Text fill="gray" font={{ size: 12 }}>
        coordinate role
      </Text>
    </Node>
    <Node
      id="delivery"
      position={[0, 145]}
      minimumSize={{ width: 118, height: 54 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>可见属性</Text>
      <Text fill="gray" font={{ size: 12 }}>
        mark / scope / node / path
      </Text>
    </Node>
    <Node
      id="descriptor"
      position={[145, 145]}
      minimumSize={{ width: 118, height: 54 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>图例描述</Text>
      <Text fill="gray" font={{ size: 12 }}>
        guide descriptor
      </Text>
    </Node>

    <Draw way={['builtin', 'registry']} arrow="->" stroke="gray" />
    <Draw way={['custom', 'registry']} arrow="->" stroke="gray" />
    <Draw way={['binding', 'position']} arrow="->" stroke="gray" />
    <Draw way={['binding', 'resolver']} arrow="->" stroke="gray" />
    <Draw way={['registry', 'resolver']} arrow="->" stroke="gray" />
    <Draw way={['resolver', 'delivery']} arrow="->" stroke="gray" />
    <Draw way={['resolver', 'descriptor']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
