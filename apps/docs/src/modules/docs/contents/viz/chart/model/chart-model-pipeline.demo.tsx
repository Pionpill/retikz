import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Chart 从编写输入收敛为可由 Core 消费的基础图形 */
const Demo: FC = () => (
  <Layout width={760} height={180} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="authoring" position={[-300, 0]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} cornerRadius={4}>
      React / Vanilla
    </Node>
    <Node id="source" position={[-150, 0]} stroke="darkorange" fill="darkorange" fillOpacity={0.08} cornerRadius={4}>
      Exact Source IR
    </Node>
    <Node id="bound" position={[0, 0]} stroke="gray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      BoundChart
    </Node>
    <Node id="base" position={[150, 0]} stroke="gray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      IRBaseChart
    </Node>
    <Node id="output" position={[305, 0]} stroke="seagreen" fill="seagreen" fillOpacity={0.08} cornerRadius={4}>
      Surface + Plot
    </Node>

    <Draw way={['authoring', 'source']} arrow="->" />
    <Draw way={['source', 'bound']} arrow="->" />
    <Draw way={['bound', 'base']} arrow="->" />
    <Draw way={['base', 'output']} arrow="->" />
  </Layout>
);

export default Demo;
