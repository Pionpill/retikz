import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 简介页"包关系"插图
 * @description core → render → {react, vanilla} 的依赖图。节点全 stroke="none" 当文字锚点，Draw 按 bbox 自动贴边。
 *   实线 = 主构建链（右侧包构建在左侧包之上）；虚线 = react / vanilla 直接消费 core 的 IR。
 *   包名与职责用同组 Node 承载，避免把职责说明做成额外 label；第一行强调包名，第二行灰色说明职责。
 */
const Demo: FC = () => (
  <Layout width={560} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="core" position={[-240, 0]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/core
    </Node>
    <Node id="core-caption" position={[-240, 20]} stroke="none" textColor="gray" font={{ size: 12 }}>
      IR + compileToScene
    </Node>

    <Node id="render" position={[-30, 0]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/render
    </Node>
    <Node id="render-caption" position={[-30, 20]} stroke="none" textColor="gray" font={{ size: 12 }}>
      ./svg · ./canvas
    </Node>

    <Node id="react" position={[195, -95]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/react
    </Node>
    <Node id="react-caption" position={[195, -75]} stroke="none" textColor="gray" font={{ size: 12 }}>
      JSX DSL
    </Node>

    <Node id="vanilla" position={[195, 95]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/vanilla
    </Node>
    <Node id="vanilla-caption" position={[195, 115]} stroke="none" textColor="gray" font={{ size: 12 }}>
      framework-free / SSR
    </Node>

    <Draw way={['core', 'render']} arrow="->" />
    <Draw way={['render', 'react']} arrow="->" />
    <Draw way={['render', 'vanilla']} arrow="->" />

    <Draw way={['core', 'react']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['core', 'vanilla']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
