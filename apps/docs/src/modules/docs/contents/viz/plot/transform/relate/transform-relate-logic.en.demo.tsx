import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/** relate grouping, dual endpoint selection, projection, and relation-row output */
const Demo: FC = () => (
  <Layout width={780} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="rows"
      position={[-330, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Detail rows</Text>
      <Text fill="gray" font={{ size: 12 }}>
        N rows
      </Text>
    </Node>
    <Node
      id="group"
      position={[-195, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Group by groupBy</Text>
      <Text fill="gray" font={{ size: 12 }}>
        one group when omitted
      </Text>
    </Node>
    <Node
      id="source"
      position={[-25, -42]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Select source</Text>
      <Text fill="gray" font={{ size: 12 }}>
        first source.selector row
      </Text>
    </Node>
    <Node
      id="target"
      position={[-25, 42]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Select target</Text>
      <Text fill="gray" font={{ size: 12 }}>
        first target.selector row
      </Text>
    </Node>
    <Node
      id="config"
      position={[155, 78]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Projection and measures</Text>
      <Text fill="gray" font={{ size: 12 }}>
        fields · measures
      </Text>
    </Node>
    <Node
      id="project"
      position={[155, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Join and derive fields</Text>
      <Text fill="gray" font={{ size: 12 }}>
        fields · measures
      </Text>
    </Node>
    <Node
      id="output"
      position={[325, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      align="middle"
      lineHeight={16}
    >
      <Text font={{ size: 14, weight: 'bold' }}>Emit relation row</Text>
      <Text fill="gray" font={{ size: 12 }}>
        0 or 1 row per group
      </Text>
    </Node>

    <Draw way={['rows', 'group']} arrow="->" />
    <Draw way={['group', 'source']} arrow="->" />
    <Draw way={['group', 'target']} arrow="->" />
    <Draw way={['source', 'project']} arrow="->" />
    <Draw way={['target', 'project']} arrow="->" />
    <Draw way={['project', 'output']} arrow="->" />
    <Draw way={['config', 'project']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
