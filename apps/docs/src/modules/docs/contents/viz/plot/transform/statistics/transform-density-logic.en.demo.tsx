import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** density finite-sample filtering, bandwidth resolution, KDE sampling, and output */
const Demo: FC = () => (
  <Layout width={440} height={380} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-70, -150]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>1D sample rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[-70, -80]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Group finite values</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy · field
      </Text>
    </Node>
    <Node
      id="strategy"
      position={[120, -10]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Bandwidth strategy</Text>
      <Text fill="gray" font={{ size: 12 }}>
        silverman or explicit value
      </Text>
    </Node>
    <Node
      id="bandwidth"
      position={[-70, -10]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Resolve bandwidth</Text>
      <Text fill="gray" font={{ size: 12 }}>
        h &gt; 0
      </Text>
    </Node>
    <Node
      id="sampling"
      position={[120, 60]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Sampling config</Text>
      <Text fill="gray" font={{ size: 12 }}>
        extent · sampleCount
      </Text>
    </Node>
    <Node
      id="kde"
      position={[-70, 60]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Evaluate Gaussian KDE</Text>
      <Text fill="gray" font={{ size: 12 }}>
        mean of all sample kernels
      </Text>
    </Node>
    <Node
      id="error"
      position={[120, -80]}
      stroke="red"
      fill="red"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Invalid sample or h</Text>
      <Text fill="gray" font={{ size: 12 }}>
        lowering throws
      </Text>
    </Node>
    <Node
      id="output"
      position={[-70, 140]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Emit density rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sampleCount rows per group
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'bandwidth']} arrow="->" />
    <Draw way={['bandwidth', 'kde']} arrow="->" />
    <Draw way={['kde', 'output']} arrow="->" />
    <Draw way={['strategy', 'bandwidth']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['sampling', 'kde']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'bandwidth',
        {
          label: {
            text: 'invalid',
            position: 'midway',
            side: 'top',
            sloped: true,
            textColor: 'red',
            font: { size: 12 },
          },
        },
        'error',
      ]}
      arrow="->"
      stroke="red"
    />
  </Layout>
);

export default Demo;
