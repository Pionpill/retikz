import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * 叙述图：可嵌入 Tier2 的静态贡献链路。
 * <Layout> 静态读子组件 props（不渲染组件）→ adapter.contribute 分出 node 与 provider graph
 *   → Core 解析 roots 的依赖闭包 → 与显式 definitions 合并后进入 compile。所有 label 为技术词，单文件共用。
 */
const Demo: FC = () => (
  <Layout width={760} height={250} fontSize={14} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 顶行：从子组件到 compile 的主链路 */}
    <Node id="child" position={[-330, -20]} stroke="none">
      {'<Panel/> props'}
    </Node>
    <Node id="contribute" position={[-125, -20]} stroke="none">
      adapter.contribute
    </Node>
    <Node id="resolve" position={[120, -20]} stroke="none" font={{ weight: 'bold' }}>
      resolve dependencies
    </Node>
    <Node id="compile" position={[330, -20]} stroke="none">
      compile
    </Node>

    <Draw
      way={[
        'child',
        { label: { text: 'static read', side: 'top', textColor: 'gray', font: { size: 12 } } },
        'contribute',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'resolve',
        {
          label: {
            text: 'dependency first',
            position: 'midway',
            side: 'top',
            sloped: false,
            textColor: 'gray',
            font: { size: 12 },
          },
        },
        'compile',
      ]}
      arrow="->"
    />

    {/* 底行：node 进入 IR；roots/providers/datasets 进入 Core resolver；显式 definitions 是最终输入 */}
    <Node id="node" position={[-220, 105]} stroke="none">
      node (into IR)
    </Node>
    <Node id="graph" position={[10, 105]} stroke="none">
      roots + providers + datasets
    </Node>
    <Node id="explicit" position={[275, 105]} stroke="none" textColor="gray">
      explicit definitions
    </Node>

    <Draw way={['contribute', 'node']} arrow="->" />
    <Draw way={['contribute', 'graph']} arrow="->" />
    <Draw way={['graph', 'resolve']} arrow="->" />
    <Draw way={['explicit', 'resolve']} arrow="->" dashPattern={[4, 3]} />
    <Draw way={['node', 'compile']} arrow="->" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
