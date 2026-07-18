import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Layout 从 React 输入到渲染结果的职责闭环 */
const Demo: FC = () => (
  <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="jsx" position={[-270, -55]} stroke="dimgray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      JSX children
    </Node>
    <Node id="ir-input" position={[-270, 55]} stroke="dimgray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      ir prop
    </Node>
    <Node
      id="layout"
      position={[-120, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ weight: 'bold' }}
    >
      Layout（React）
    </Node>
    <Node
      id="definitions"
      position={[-120, -105]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
    >
      definitions / options
    </Node>
    <Node id="core-ir" position={[15, 0]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} cornerRadius={4}>
      Core IR
    </Node>
    <Node
      id="compile"
      position={[155, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ weight: 'bold' }}
    >
      compile（core）
    </Node>
    <Node id="scene" position={[285, 0]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} cornerRadius={4}>
      Scene
    </Node>
    <Node id="render" position={[155, 100]} stroke="dimgray" fill="lightgray" fillOpacity={0.16} cornerRadius={4}>
      render 执行
    </Node>
    <Node id="output" position={[285, 100]} stroke="dodgerblue" fill="dodgerblue" fillOpacity={0.08} cornerRadius={4}>
      SVG / Canvas
    </Node>

    <Draw way={['jsx', 'layout']} arrow="->" />
    <Draw way={['ir-input', 'layout']} arrow="->" />
    <Draw way={['definitions', 'layout']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['layout', 'core-ir']} arrow="->" />
    <Draw way={['core-ir', 'compile']} arrow="->" />
    <Draw way={['compile', 'scene']} arrow="->" />
    <Draw way={['scene', 'render']} arrow="->" />
    <Draw way={['render', 'output']} arrow="->" />
  </Layout>
);

export default Demo;
