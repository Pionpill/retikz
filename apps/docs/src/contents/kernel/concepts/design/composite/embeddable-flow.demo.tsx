import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 叙述图：可嵌入 Tier2 的静态贡献链路。
 * <Layout> 静态读子组件 props（不渲染组件）→ 经 adapter.contribute 得到 node + datasets + makeComposites
 *   → 按 namespace 汇总 → 与显式 composites 并入 compile。所有 label 为技术词，单文件共用。
 */
const Demo: FC = () => (
  <Layout width={680} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 顶行：从子组件到 compile 的主链路 */}
    <Node id="child" position={[-300, 0]} stroke="none">
      {'<Panel/> props'}
    </Node>
    <Node id="contribute" position={[-90, 0]} stroke="none">
      adapter.contribute
    </Node>
    <Node id="aggregate" position={[150, 0]} stroke="none">
      Layout aggregates
    </Node>
    <Node id="compile" position={[330, 0]} stroke="none">
      compile
    </Node>

    <Draw
      way={['child', { label: { text: 'static read', side: 'above', textColor: 'gray', font: { size: 12 } } }, 'contribute']}
      arrow="->"
    />
    <Draw way={['contribute', 'aggregate']} arrow="->" />
    <Draw
      way={['aggregate', { label: { text: 'by namespace', side: 'above', textColor: 'gray', font: { size: 12 } } }, 'compile']}
      arrow="->"
    />

    {/* 底行：contribute 产出的三件贡献 */}
    <Node id="node" position={[-180, 110]} stroke="none">
      node (into IR)
    </Node>
    <Node id="datasets" position={[-20, 110]} stroke="none" textColor="gray">
      datasets (not IR)
    </Node>
    <Node id="makeComposites" position={[170, 110]} stroke="none">
      makeComposites
    </Node>

    <Draw way={['contribute', 'node']} arrow="->" />
    <Draw way={['contribute', 'datasets']} arrow="->" dashPattern={[4, 3]} />
    <Draw way={['contribute', 'makeComposites']} arrow="->" />

    <Draw way={['node', 'aggregate']} arrow="->" />
    <Draw way={['makeComposites', 'aggregate']} arrow="->" />
  </Layout>
);

export default Demo;
