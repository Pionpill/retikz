import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** 技术原理页的 Kernel 包职责图 */
const Demo: FC = () => (
  <Layout width={760} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="core-group"
      position={[-50, 8]}
      minimumSize={{ width: 250, height: 82 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    >
      {' '}
    </Node>
    <Node position={[-130, -21]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      @retikz/core
    </Node>

    <Node
      id="react"
      position={[-310, -20]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      @retikz/react
    </Node>
    <Node
      id="vanilla"
      position={[-310, 58]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      @retikz/vanilla
    </Node>
    <Node
      id="ir"
      position={[-205, 19]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      IR
    </Node>

    <Node
      id="lowering"
      position={[-125, 19]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      lowering
    </Node>
    <Node
      id="resolve"
      position={[-50, 19]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'layout\nresolve'}
    </Node>
    <Node
      id="assemble"
      position={[30, 19]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      assemble
    </Node>

    <Node
      id="math"
      position={[-125, 84]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      @retikz/math
    </Node>
    <Node
      id="tex"
      position={[30, 84]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'@retikz/tex\n(optional)'}
    </Node>

    <Node
      id="scene"
      position={[110, 19]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Scene
    </Node>
    <Node
      id="render"
      position={[220, 19]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      @retikz/render
    </Node>
    <Node
      id="svg"
      position={[325, -20]}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.12}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      SVG
    </Node>
    <Node
      id="canvas"
      position={[325, 58]}
      stroke="gray"
      fill="lightgray"
      fillOpacity={0.12}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      Canvas
    </Node>

    <Draw way={['react', 'ir']} arrow="->" />
    <Draw way={['vanilla', 'ir']} arrow="->" />
    <Draw way={['ir', 'lowering']} arrow="->" />
    <Draw way={['lowering', 'resolve']} arrow="->" />
    <Draw way={['resolve', 'assemble']} arrow="->" />
    <Draw way={['assemble', 'scene']} arrow="->" />
    <Draw way={['scene', 'render']} arrow="->" />
    <Draw way={['render', 'svg']} arrow="->" />
    <Draw way={['render', 'canvas']} arrow="->" />
    <Draw way={['math', 'lowering']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['tex', 'assemble']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
