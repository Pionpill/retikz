import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={660} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="react_dsl" position={[-230, -24]} stroke="none">
      React DSL
    </Node>
    <Node id="vanilla_dsl" position={[-230, 24]} stroke="none">
      Vanilla DSL
    </Node>

    <Node id="ir" position={[-70, 0]} stroke="none">
      IR (JSON)
    </Node>
    <Node id="persist" position={[-70, 70]} stroke="none" textColor="gray">
      persistence / AI edit
    </Node>

    <Node id="scene" position={[90, 0]} stroke="none">
      Scene
    </Node>
    <Node id="layout" position={[90, 70]} stroke="none" textColor="gray">
      measured primitives
    </Node>

    <Node id="svg" position={[250, -24]} stroke="none">
      SVG renderer
    </Node>
    <Node id="canvas" position={[250, 24]} stroke="none">
      Canvas (Node/SSR)
    </Node>

    <Draw way={['react_dsl', 'ir']} arrow="->" />
    <Draw way={['vanilla_dsl', 'ir']} arrow="->" />
    <Draw way={['ir', 'scene']} arrow="->" />
    <Draw way={['scene', 'svg']} arrow="->" />
    <Draw way={['scene', 'canvas']} arrow="->" />
    <Draw way={['ir', 'persist']} arrow="<->" dashPattern={[4, 3]} />
    <Draw way={['scene', 'layout']} arrow="->" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
