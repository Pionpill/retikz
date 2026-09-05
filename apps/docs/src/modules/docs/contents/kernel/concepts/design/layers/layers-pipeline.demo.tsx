import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={660} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="react_dsl" position={[-230, -24]} style={{ stroke: 'none' }}>
      React DSL
    </Node>
    <Node id="vanilla_dsl" position={[-230, 24]} style={{ stroke: 'none' }}>
      Vanilla DSL
    </Node>

    <Node id="ir" position={[-70, 0]} style={{ stroke: 'none' }}>
      IR (JSON)
    </Node>
    <Node id="persist" position={[-70, 70]} style={{ stroke: 'none', textColor: 'gray' }}>
      persistence / AI edit
    </Node>

    <Node id="scene" position={[90, 0]} style={{ stroke: 'none' }}>
      Scene
    </Node>
    <Node id="layout" position={[90, 70]} style={{ stroke: 'none', textColor: 'gray' }}>
      measured primitives
    </Node>

    <Node id="svg" position={[250, -24]} style={{ stroke: 'none' }}>
      SVG renderer
    </Node>
    <Node id="canvas" position={[250, 24]} style={{ stroke: 'none' }}>
      Canvas (Node/SSR)
    </Node>

    <Draw way={['react_dsl', 'ir']} arrow="->" />
    <Draw way={['vanilla_dsl', 'ir']} arrow="->" />
    <Draw way={['ir', 'scene']} arrow="->" />
    <Draw way={['scene', 'svg']} arrow="->" />
    <Draw way={['scene', 'canvas']} arrow="->" />
    <Draw way={['ir', 'persist']} arrow="<->" style={{ dashPattern: [4, 3] }} />
    <Draw way={['scene', 'layout']} arrow="->" style={{ dashPattern: [4, 3] }} />
  </Layout>
);

export default Demo;
