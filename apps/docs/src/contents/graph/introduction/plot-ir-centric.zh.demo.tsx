import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 简介页 "Plot IR 居中" 插图
 * @description 组件 / spec / AI 先汇聚成 Plot IR；真实数据不进入 IR，只在 lowerPlots 阶段与规格汇合，再下沉到 core IR / Scene。
 */
const Demo: FC = () => (
  <Layout width={600} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="react" position={[-210, -54]} stroke="none">
      React &lt;Plot&gt;
    </Node>
    <Node id="spec" position={[-210, 0]} stroke="none">
      手写 spec
    </Node>
    <Node id="ai" position={[-210, 54]} stroke="none">
      AI / LLM
    </Node>

    <Node
      id="plotIr"
      position={[-70, 0]}
      stroke="none"
      label={{ text: '图表语义', position: 'below', distance: 8, textColor: 'gray', font: { size: 12 } }}
    >
      Plot IR
    </Node>

    <Node
      id="data"
      position={[-70, 76]}
      stroke="none"
      textColor="gray"
      label={{ text: '不进 IR', position: 'below', distance: 8, textColor: 'gray', font: { size: 12 } }}
    >
      数据行
    </Node>

    <Node
      id="lower"
      position={[70, 0]}
      stroke="none"
      label={{ text: 'IR + data', position: 'below', distance: 8, textColor: 'gray', font: { size: 12 } }}
    >
      lowerPlots
    </Node>
    <Node
      id="core"
      position={[220, 0]}
      stroke="none"
      label={{ text: 'Node · Path · Scene', position: 'below', distance: 8, textColor: 'gray', font: { size: 12 } }}
    >
      core IR / Scene
    </Node>

    <Draw way={['react', 'plotIr']} arrow="->" />
    <Draw way={['spec', 'plotIr']} arrow="->" />
    <Draw way={['ai', 'plotIr']} arrow="->" />
    <Draw way={['plotIr', 'lower']} arrow="->" />
    <Draw way={['data', 'lower']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['lower', 'core']} arrow="->" />
  </Layout>
);

export default Demo;
