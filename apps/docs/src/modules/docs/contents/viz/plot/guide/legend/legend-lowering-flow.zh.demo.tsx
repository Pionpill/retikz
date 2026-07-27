import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

import { LogicFrame, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

/** Legend 复用通道描述、选择形态并下沉为独立 scope 的流程 */
const Demo: FC = () => (
  <Layout width={760} height={225} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="legend-guide"
      position={[-275, -50]}
      minimumSize={{ width: 170, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Legend guide</Text>
      <Text fill="gray" font={{ size: 12 }}>
        channel · scale? · ticks · layer?
      </Text>
    </Node>
    <Node
      id="descriptors"
      position={[-275, 50]}
      minimumSize={{ width: 170, height: 50 }}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>通道描述</Text>
      <Text fill="gray" font={{ size: 12 }}>
        domain · range · evaluator
      </Text>
    </Node>

    <Node
      id="legend-resolver"
      position={[-80, 0]}
      minimumSize={{ width: 160, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>解析图例</Text>
      <Text fill="gray" font={{ size: 12 }}>
        唯一 descriptor + 形态
      </Text>
    </Node>

    <Node
      id="theme-style"
      position={[-80, 95]}
      minimumSize={{ width: 180, height: 50 }}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>主题 + style</Text>
      <Text fill="gray" font={{ size: 12 }}>
        默认值 + 局部覆盖
      </Text>
    </Node>

    <LogicFrame id="legend-forms">
      <LogicFrameTitle>图例形态</LogicFrameTitle>
      <Node
        id="swatch-form"
        position={[120, -65]}
        minimumSize={{ width: 160, height: 50 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>色块</Text>
        <Text fill="gray" font={{ size: 12 }}>
          分类 · 分箱
        </Text>
      </Node>
      <Node
        id="ramp-form"
        position={[120, 0]}
        minimumSize={{ width: 160, height: 50 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>色带</Text>
        <Text fill="gray" font={{ size: 12 }}>
          连续颜色 + ticks
        </Text>
      </Node>
      <Node
        id="symbol-form"
        position={[120, 65]}
        minimumSize={{ width: 160, height: 50 }}
        stroke="gray"
        fill="gray"
        fillOpacity={0.06}
        cornerRadius={4}
        align="middle"
        lineHeight={16}
      >
        <Text font={{ size: 14, weight: 'bold' }}>符号条目</Text>
        <Text fill="gray" font={{ size: 12 }}>
          size · shape · opacity
        </Text>
      </Node>
    </LogicFrame>

    <Node
      id="legend-scope"
      position={[330, 0]}
      minimumSize={{ width: 180, height: 50 }}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Legend scope</Text>
      <Text fill="gray" font={{ size: 12 }}>
        预留带 · zIndex 500 / layer
      </Text>
    </Node>

    <Draw way={['legend-guide', 'legend-resolver']} arrow="->" />
    <Draw way={['descriptors', 'legend-resolver']} arrow="->" />
    <Draw way={['theme-style', 'legend-resolver']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['legend-resolver', 'swatch-form']} arrow="->" />
    <Draw way={['legend-resolver', 'ramp-form']} arrow="->" />
    <Draw way={['legend-resolver', 'symbol-form']} arrow="->" />
    <Draw way={['swatch-form', 'legend-scope']} arrow="->" />
    <Draw way={['ramp-form', 'legend-scope']} arrow="->" />
    <Draw way={['symbol-form', 'legend-scope']} arrow="->" />
  </Layout>
);

export default Demo;
