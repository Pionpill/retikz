import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Kernel 包级架构与主数据流总览 */
const Demo: FC = () => (
  <Layout width={740} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="core-group"
      position={[-55, 0]}
      minimumSize={{ width: 350, height: 74 }}
      stroke="lightgray"
      fill="lightgray"
      fillOpacity={0.04}
      dashPattern={[4, 3]}
      cornerRadius={4}
    >
      {' '}
    </Node>
    <Node position={[-175, -27]} stroke="none" fill="none" padding={0} textColor="gray" font={{ size: 12 }}>
      @retikz/core
    </Node>

    <Node
      id="react"
      position={[-315, -42]}
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
      position={[-315, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      @retikz/vanilla
    </Node>
    <Node
      id="external-ir"
      position={[-315, 42]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      external IR
    </Node>

    <Node
      id="ir"
      position={[-185, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      IR
    </Node>
    <Node
      id="compile"
      position={[-55, 0]}
      stroke="dimgray"
      fill="dimgray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      compileToScene
    </Node>
    <Node
      id="scene"
      position={[70, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Scene
    </Node>

    <Node
      id="math"
      position={[-110, 78]}
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
      position={[10, 78]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'@retikz/tex\n(optional)'}
    </Node>

    <Node
      id="render"
      position={[210, 0]}
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
      position={[315, -24]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      SVG
    </Node>
    <Node
      id="canvas"
      position={[315, 24]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.06}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      Canvas
    </Node>

    <Draw way={['react', 'ir']} arrow="->" />
    <Draw way={['vanilla', 'ir']} arrow="->" />
    <Draw way={['external-ir', 'ir']} arrow="->" />
    <Draw way={['ir', 'compile']} arrow="->" />
    <Draw way={['compile', 'scene']} arrow="->" />
    <Draw way={['scene', 'render']} arrow="->" />
    <Draw way={['render', 'svg']} arrow="->" />
    <Draw way={['render', 'canvas']} arrow="->" />
    <Draw way={['math', 'compile']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['tex', 'compile']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
