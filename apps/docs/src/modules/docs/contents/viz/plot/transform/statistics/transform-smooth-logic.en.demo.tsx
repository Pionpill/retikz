import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** smooth finite-pair filtering, OLS fit, extent sampling, and predicted output */
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
      <Text font={{ size: 14, weight: 'bold' }}>(x, y) sample rows</Text>
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
      <Text font={{ size: 14, weight: 'bold' }}>Group finite pairs</Text>
      <Text fill="gray" font={{ size: 12 }}>
        groupBy · x · y
      </Text>
    </Node>
    <Node
      id="method"
      position={[120, -10]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>method</Text>
      <Text fill="gray" font={{ size: 12 }}>
        linear
      </Text>
    </Node>
    <Node
      id="fit"
      position={[-70, -10]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Fit OLS model</Text>
      <Text fill="gray" font={{ size: 12 }}>
        intercept + slope × x
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
      id="predict"
      position={[-70, 60]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Sample x and predict y</Text>
      <Text fill="gray" font={{ size: 12 }}>
        evenly spaced points
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
      <Text font={{ size: 14, weight: 'bold' }}>Cannot fit</Text>
      <Text fill="gray" font={{ size: 12 }}>
        too few pairs or zero x variance
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
      <Text font={{ size: 14, weight: 'bold' }}>Emit trend rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        sampleCount rows per group
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'fit']} arrow="->" />
    <Draw way={['fit', 'predict']} arrow="->" />
    <Draw way={['predict', 'output']} arrow="->" />
    <Draw way={['method', 'fit']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['sampling', 'predict']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['fit', 'error']} arrow="->" stroke="red" />
  </Layout>
);

export default Demo;
