import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={620} height={190} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="dsl" position={[-230, -36]} stroke="none">
      DSL
    </Node>
    <Node id="kernel" position={[-230, 0]} stroke="none" textColor="gray">
      Kernel / Sugar
    </Node>
    <Node id="author" position={[-230, 42]} stroke="none" textColor="gray">
      authoring
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

    <Node id="svg" position={[250, -36]} stroke="none">
      React + SVG
    </Node>
    <Node id="canvas" position={[250, 0]} stroke="none">
      Canvas
    </Node>
    <Node id="native" position={[250, 36]} stroke="none">
      Native / PDF
    </Node>

    <Draw way={['dsl', 'ir']} arrow="->" />
    <Draw way={['kernel', 'ir']} arrow="->" dashPattern={[4, 3]} />
    <Draw way={['ir', 'scene']} arrow="->" />
    <Draw way={['scene', 'svg']} arrow="->" />
    <Draw way={['scene', 'canvas']} arrow="->" />
    <Draw way={['scene', 'native']} arrow="->" />
    <Draw way={['ir', 'persist']} arrow="<->" dashPattern={[4, 3]} />
    <Draw way={['scene', 'layout']} arrow="->" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
