import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** derive-interval 的模式优先级、逐行派生与错误出口 */
const Demo: FC = () => (
  <Layout>
    <Node
      id="explicit-mode"
      position={[-300, -45]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>① 显式区间</Text>
      <Text fill="gray" font={{ size: 12 }}>
        startFrom + endFrom
      </Text>
    </Node>
    <Node
      id="baseline-mode"
      position={[-300, 85]}
      cornerRadius={4}
      style={{ stroke: 'gray', fill: 'gray', fillOpacity: 0.06 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>② 基线到值</Text>
      <Text fill="gray" font={{ size: 12 }}>
        from + baseline
      </Text>
    </Node>
    <Node
      id="resolve-mode"
      position={[-100, 35]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>解析有效模式</Text>
      <Text fill="gray" font={{ size: 12 }}>
        ① 优先；缺省才读取 ②
      </Text>
    </Node>
    <Node
      id="error"
      position={[-100, -55]}
      cornerRadius={4}
      style={{ stroke: 'red', fill: 'red', fillOpacity: 0.06 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>配置不完整</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering 抛错
      </Text>
    </Node>
    <Node
      id="rows"
      position={[100, -55]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>输入行</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="derive"
      position={[100, 35]}
      cornerRadius={4}
      style={{ stroke: 'dodgerblue', fill: 'dodgerblue', fillOpacity: 0.08 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>逐行派生区间</Text>
      <Text fill="gray" font={{ size: 12 }}>
        finiteOr(source, baseline)
      </Text>
    </Node>
    <Node
      id="output"
      position={[300, 35]}
      cornerRadius={4}
      style={{ stroke: 'darkorange', fill: 'darkorange', fillOpacity: 0.08 }}
      layout={{ align: 'middle', lineHeight: 16 }}
    >
      <Text font={{ size: 14, weight: 'bold' }}>写入区间字段</Text>
      <Text fill="gray" font={{ size: 12 }}>
        startField · endField · N → N
      </Text>
    </Node>

    <Draw way={['explicit-mode', 'resolve-mode']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['baseline-mode', 'resolve-mode']} arrow="->" style={{ stroke: 'gray', dashPattern: [4, 3] }} />
    <Draw way={['resolve-mode', 'error']} arrow="->" style={{ stroke: 'red' }} />
    <Draw
      way={[
        'resolve-mode',
        {
          label: {
            text: 'mode',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'derive',
      ]}
      arrow="->"
      style={{ stroke: 'gray', dashPattern: [4, 3] }}
    />
    <Draw way={['rows', 'derive']} arrow="->" />
    <Draw way={['derive', 'output']} arrow="->" />
  </Layout>
);

export default Demo;
