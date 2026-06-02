import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 简介页"包关系"插图
 * @description core → render → {react, vanilla} 的依赖图。节点全 stroke="none" 当文字锚点，Draw 按 bbox 自动贴边。
 *   实线 = 主构建链（右侧包构建在左侧包之上）；虚线 = react / vanilla 直接消费 core 的 IR。
 *   各包职责用 Node 的 label（position='below'、灰色）挂在节点下方。全 label 都是技术词，单文件共用、不拆双语。
 */
const Demo: FC = () => (
  <Layout width={560} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="core" position={[-240, 0]} stroke="none" label={{ text: 'IR + compileToScene', position: 'below', distance: 7, textColor: 'gray', font: { size: 12 } }}>
      @retikz/core
    </Node>

    <Node id="render" position={[-30, 0]} stroke="none" label={{ text: './svg · ./canvas', position: 'below', distance: 7, textColor: 'gray', font: { size: 12 } }}>
      @retikz/render
    </Node>

    <Node id="react" position={[195, -95]} stroke="none" label={{ text: 'JSX DSL', position: 'below', distance: 7, textColor: 'gray', font: { size: 12 } }}>
      @retikz/react
    </Node>

    <Node id="vanilla" position={[195, 95]} stroke="none" label={{ text: 'framework-free / SSR', position: 'below', distance: 7, textColor: 'gray', font: { size: 12 } }}>
      @retikz/vanilla
    </Node>

    <Draw way={['core', 'render']} arrow="->" />
    <Draw way={['render', 'react']} arrow="->" />
    <Draw way={['render', 'vanilla']} arrow="->" />

    <Draw way={['core', 'react']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['core', 'vanilla']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
