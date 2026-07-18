import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 技术原理页的 Kernel 包职责图 */
const Demo: FC = () => (
  <Layout width={700} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="math" position={[-280, 0]} stroke="none" font={{ size: 15 }}>
      @retikz/math
    </Node>

    <Node id="core" position={[-100, 0]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/core
    </Node>

    <Node id="render" position={[80, 0]} stroke="none" font={{ size: 15 }}>
      @retikz/render
    </Node>

    <Node id="react" position={[270, -76]} stroke="none" font={{ size: 15 }}>
      @retikz/react
    </Node>

    <Node id="vanilla" position={[270, 76]} stroke="none" font={{ size: 15 }}>
      @retikz/vanilla
    </Node>

    <Node id="tex" position={[-100, 100]} stroke="none" font={{ size: 15 }}>
      @retikz/tex
    </Node>

    <Draw way={['math', 'core']} arrow="->" />
    <Draw way={['core', 'render']} arrow="->" />
    <Draw way={['render', 'react']} arrow="->" />
    <Draw way={['render', 'vanilla']} arrow="->" />
    <Draw way={['core', 'tex']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['math', { bend: 'left', angle: 20 }, 'render']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['core', 'react']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['core', 'vanilla']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
