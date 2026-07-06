import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * 通道落地页 "通道建立与消费" 插图
 * @description 通道先从 React DSL prop 建立为 PlotSpec 里的字段 / 常量绑定，再由 definition 声明消费面，最后被 GoG 各环节读取。
 */
const Demo: FC = () => (
  <Layout width={640} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="dsl" position={[-245, -64]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>React DSL</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {'<PointMark x="gdp" />'}
      </Text>
    </Node>
    <Node id="spec" position={[-75, -64]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>PlotSpec</Text>
      <Text fill="gray" font={{ size: 12 }}>
        encoding.x = field
      </Text>
    </Node>
    <Node id="definition" position={[100, -64]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Definition</Text>
      <Text fill="gray" font={{ size: 12 }}>
        kind / resolve / deliver
      </Text>
    </Node>
    <Node id="hub" position={[250, -64]} stroke="none" align="middle" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>GoG 消费</Text>
      <Text fill="gray" font={{ size: 12 }}>
        同一绑定，不同问题
      </Text>
    </Node>

    <Draw way={['dsl', 'spec']} arrow="->" />
    <Draw way={['spec', 'definition']} arrow="->" />
    <Draw way={['definition', 'hub']} arrow="->" />

    <Node id="model" position={[-215, 50]} stroke="none" align="middle" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>data model</Text>
      <Text fill="gray" font={{ size: 11 }}>
        字段类型
      </Text>
    </Node>
    <Node id="transform" position={[-90, 50]} stroke="none" align="middle" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>transform</Text>
      <Text fill="gray" font={{ size: 11 }}>
        分组 / 顺序
      </Text>
    </Node>
    <Node id="scale" position={[35, 50]} stroke="none" align="middle" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>scale</Text>
      <Text fill="gray" font={{ size: 11 }}>
        domain / range
      </Text>
    </Node>
    <Node id="coordinate" position={[160, 50]} stroke="none" align="middle" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>coordinate</Text>
      <Text fill="gray" font={{ size: 11 }}>
        位置投影
      </Text>
    </Node>
    <Node id="mark" position={[275, 34]} stroke="none" align="middle" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>mark</Text>
      <Text fill="gray" font={{ size: 11 }}>
        图元语义
      </Text>
    </Node>
    <Node id="guide" position={[275, 82]} stroke="none" align="middle" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>guide</Text>
      <Text fill="gray" font={{ size: 11 }}>
        axis / legend
      </Text>
    </Node>

    <Draw way={['hub', 'model']} arrow="->" stroke="gray" />
    <Draw way={['hub', 'transform']} arrow="->" stroke="gray" />
    <Draw way={['hub', 'scale']} arrow="->" stroke="gray" />
    <Draw way={['hub', 'coordinate']} arrow="->" stroke="gray" />
    <Draw way={['hub', 'mark']} arrow="->" stroke="gray" />
    <Draw way={['hub', 'guide']} arrow="->" stroke="gray" />

    <Node id="note" position={[-65, 118]} stroke="none" align="middle">
      <Text fill="gray" font={{ size: 12 }}>
        通道只保存字段 / 常量绑定；消费者决定如何解释它
      </Text>
    </Node>
  </Layout>
);

export default Demo;
