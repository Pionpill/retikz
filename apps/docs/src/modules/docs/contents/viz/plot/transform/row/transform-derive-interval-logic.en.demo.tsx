import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** derive-interval 的英文模式优先级、逐行派生与错误出口 */
const Demo: FC = () => (
  <Layout width={440} height={360} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="explicit-mode"
      position={[-100, -140]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>① Explicit bounds</Text>
      <Text fill="gray" font={{ size: 12 }}>
        startFrom + endFrom
      </Text>
    </Node>
    <Node
      id="baseline-mode"
      position={[100, -140]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>② Baseline to value</Text>
      <Text fill="gray" font={{ size: 12 }}>
        from + baseline
      </Text>
    </Node>
    <Node
      id="resolve-mode"
      position={[0, -60]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Resolve active mode</Text>
      <Text fill="gray" font={{ size: 12 }}>
        ① first; read ② only if absent
      </Text>
    </Node>
    <Node
      id="error"
      position={[165, -60]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Incomplete config</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering throws
      </Text>
    </Node>
    <Node
      id="rows"
      position={[-140, 40]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Input rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="derive"
      position={[40, 40]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Derive each interval</Text>
      <Text fill="gray" font={{ size: 12 }}>
        finiteOr(source, baseline)
      </Text>
    </Node>
    <Node
      id="output"
      position={[40, 140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Write interval fields</Text>
      <Text fill="gray" font={{ size: 12 }}>
        startField · endField · N → N
      </Text>
    </Node>

    <Draw way={['explicit-mode', 'resolve-mode']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['baseline-mode', 'resolve-mode']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['resolve-mode', 'error']} arrow="->" stroke="red" />
    <Draw
      way={[
        'resolve-mode',
        {
          label: {
            text: 'mode',
            position: 'midway',
            side: 'right',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'derive',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw way={['rows', 'derive']} arrow="->" />
    <Draw way={['derive', 'output']} arrow="->" />
  </Layout>
);

export default Demo;
