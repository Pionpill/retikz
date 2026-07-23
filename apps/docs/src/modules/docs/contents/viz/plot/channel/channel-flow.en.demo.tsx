import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 通道绑定与 definition 汇入统一解析器的英文插图
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
      <Text font={{ size: 14, weight: 'bold' }}>PlotSpec binding</Text>
      <Text fill="gray" font={{ size: 12 }}>
        field / constant
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
      <Text font={{ size: 14, weight: 'bold' }}>Built-in definitions</Text>
      <Text fill="gray" font={{ size: 12 }}>
        built-in channels
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
      <Text font={{ size: 14, weight: 'bold' }}>Custom definitions</Text>
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
        merge by channel name
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
      <Text font={{ size: 14, weight: 'bold' }}>Resolve binding</Text>
      <Text fill="gray" font={{ size: 11 }}>
        dispatch by definition kind
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
      <Text font={{ size: 14, weight: 'bold' }}>Position binding</Text>
      <Text fill="gray" font={{ size: 12 }}>
        coordinate roles
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
      <Text font={{ size: 14, weight: 'bold' }}>Visible properties</Text>
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
      <Text font={{ size: 14, weight: 'bold' }}>Guide descriptor</Text>
      <Text fill="gray" font={{ size: 12 }}>
        legend input
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
