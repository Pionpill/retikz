import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** density finite-sample filtering, bandwidth resolution, KDE sampling, and output */
const Demo: FC = () => (
  <Layout width={720} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-295, 20]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>1D samples</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[-160, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Filter finite values</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy · field
      </Text>
    </Node>
    <Node
      id="strategy"
      position={[-10, -55]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Bandwidth strategy</Text>
      <Text fill="gray" font={{ size: 12 }}>
        silverman · value
      </Text>
    </Node>
    <Node
      id="bandwidth"
      position={[-10, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Resolve h</Text>
      <Text fill="gray" font={{ size: 12 }}>
        h &gt; 0
      </Text>
    </Node>
    <Node
      id="sampling"
      position={[140, -55]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Sampling</Text>
      <Text fill="gray" font={{ size: 12 }}>
        extent · sampleCount
      </Text>
    </Node>
    <Node
      id="kde"
      position={[140, 20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Gaussian KDE</Text>
      <Text fill="gray" font={{ size: 12 }}>
        mean of sample kernels
      </Text>
    </Node>
    <Node
      id="error"
      position={[-10, 95]}
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
      position={[290, 20]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Density rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sampleCount / group
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
            side: 'right',
            sloped: false,
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
