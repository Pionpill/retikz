import type { FC } from 'react';

import { Draw, Layout, Node, Text } from '@retikz/react';

/**
 * Channel landing page "channel creation and consumption" figure.
 * @description A channel starts as a React DSL prop, becomes a field / constant binding in PlotSpec, gets behavior from a definition, and is then read by GoG consumers.
 */
const Demo: FC = () => (
  <Layout width={640} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="dsl" position={[-248, -64]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>React DSL</Text>
      <Text fill="gray" font={{ size: 12 }}>
        {'<PointMark x="gdp" />'}
      </Text>
    </Node>
    <Node id="spec" position={[-78, -64]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>PlotSpec</Text>
      <Text fill="gray" font={{ size: 12 }}>
        encoding.x = field
      </Text>
    </Node>
    <Node id="definition" position={[98, -64]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>Definition</Text>
      <Text fill="gray" font={{ size: 12 }}>
        kind / resolve / deliver
      </Text>
    </Node>
    <Node id="hub" position={[252, -64]} stroke="none" align="center" lineHeight={16}>
      <Text font={{ size: 15, weight: 'bold' }}>GoG consumers</Text>
      <Text fill="gray" font={{ size: 12 }}>
        same binding, different questions
      </Text>
    </Node>

    <Draw way={['dsl', 'spec']} arrow="->" />
    <Draw way={['spec', 'definition']} arrow="->" />
    <Draw way={['definition', 'hub']} arrow="->" />

    <Node id="model" position={[-220, 50]} stroke="none" align="center" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>data model</Text>
      <Text fill="gray" font={{ size: 11 }}>
        field types
      </Text>
    </Node>
    <Node id="transform" position={[-94, 50]} stroke="none" align="center" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>transform</Text>
      <Text fill="gray" font={{ size: 11 }}>
        group / order
      </Text>
    </Node>
    <Node id="scale" position={[32, 50]} stroke="none" align="center" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>scale</Text>
      <Text fill="gray" font={{ size: 11 }}>
        domain / range
      </Text>
    </Node>
    <Node id="coordinate" position={[158, 50]} stroke="none" align="center" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>coordinate</Text>
      <Text fill="gray" font={{ size: 11 }}>
        projection
      </Text>
    </Node>
    <Node id="mark" position={[275, 34]} stroke="none" align="center" lineHeight={15}>
      <Text font={{ size: 13, weight: 'bold' }}>mark</Text>
      <Text fill="gray" font={{ size: 11 }}>
        mark semantics
      </Text>
    </Node>
    <Node id="guide" position={[275, 82]} stroke="none" align="center" lineHeight={15}>
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

    <Node id="note" position={[-65, 118]} stroke="none" align="center">
      <Text fill="gray" font={{ size: 12 }}>
        Channels store field / constant bindings; consumers decide how to interpret them
      </Text>
    </Node>
  </Layout>
);

export default Demo;
