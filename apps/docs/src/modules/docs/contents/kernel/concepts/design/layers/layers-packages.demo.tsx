import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * 分层页“包结构”插图
 * @description 与简介页复用同一视觉语言：包名加粗、职责置于下方，实线表示主构建链，虚线表示次要直接依赖。
 */
const Demo: FC = () => (
  <Layout width={640} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="math" position={[-270, 0]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/math
    </Node>
    <Node id="math-caption" position={[-270, 20]} stroke="none" textColor="gray" font={{ size: 12 }}>
      pure geometry
    </Node>

    <Node id="core" position={[-100, 0]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/core
    </Node>
    <Node id="core-caption" position={[-100, 20]} stroke="none" textColor="gray" font={{ size: 12 }}>
      IR + compileToScene
    </Node>

    <Node id="render" position={[70, 0]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/render
    </Node>
    <Node id="render-caption" position={[70, 20]} stroke="none" textColor="gray" font={{ size: 12 }}>
      ./svg · ./canvas
    </Node>

    <Node id="react" position={[250, -75]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/react
    </Node>
    <Node id="react-caption" position={[250, -55]} stroke="none" textColor="gray" font={{ size: 12 }}>
      JSX DSL
    </Node>

    <Node id="vanilla" position={[250, 75]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/vanilla
    </Node>
    <Node id="vanilla-caption" position={[250, 95]} stroke="none" textColor="gray" font={{ size: 12 }}>
      framework-free / SSR
    </Node>

    <Node id="tex" position={[-100, 110]} stroke="none" font={{ size: 15, weight: 'bold' }}>
      @retikz/tex
    </Node>
    <Node id="tex-caption" position={[-100, 130]} stroke="none" textColor="gray" font={{ size: 12 }}>
      LaTeX math lowering
    </Node>

    <Draw way={['math', 'core']} arrow="->" />
    <Draw way={['core', 'render']} arrow="->" />
    <Draw way={['render', 'react']} arrow="->" />
    <Draw way={['render', 'vanilla']} arrow="->" />
    <Draw way={['core', 'tex']} arrow="->" />

    <Draw way={['math', { bend: 'left', angle: 20 }, 'render']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['core', 'react']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['core', 'vanilla']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
