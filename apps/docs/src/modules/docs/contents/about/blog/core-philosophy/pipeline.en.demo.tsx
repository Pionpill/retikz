import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * Core-philosophy article illustration: IR-centered pipeline
 * @description Mirrors the ir-centric diagram on /kernel/introduction — 4 inputs → IR ↔ Scene → 4 outputs (hourglass); nodes use stroke="none" as text anchors with Draw still snapping to bbox; bidirectional arrow between IR and "persistence / edit" marks IR as a read/write durable layer.
 *   Shipped parts use the default color (currentColor); planned / unimplemented ones (Text DSL, adapters other than React) are dimmed to gray.
 */
const Demo: FC = () => (
  <Layout width={640} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="sugar" position={[-160, -54]} style={{ stroke: 'none' }}>
      Sugar JSX
    </Node>
    <Node id="kernel" position={[-160, -18]} style={{ stroke: 'none' }}>
      Kernel JSX
    </Node>
    <Node id="dsl" position={[-160, 18]} style={{ stroke: 'none', textColor: 'gray' }}>
      Text DSL*
    </Node>
    <Node id="ai" position={[-160, 54]} style={{ stroke: 'none' }}>
      AI / LLM
    </Node>

    <Node id="ir" position={[-40, 0]} style={{ stroke: 'none' }}>
      IR (JSON)
    </Node>
    <Node id="scene" position={[60, 0]} style={{ stroke: 'none' }}>
      Scene
    </Node>

    <Node id="react" position={[200, -54]} style={{ stroke: 'none' }}>
      React + SVG
    </Node>
    <Node id="svg" position={[200, -18]} style={{ stroke: 'none', textColor: 'gray' }}>
      pure SVG string
    </Node>
    <Node id="canvas" position={[200, 18]} style={{ stroke: 'none', textColor: 'gray' }}>
      Canvas
    </Node>
    <Node id="raster" position={[350, 18]} style={{ stroke: 'none', textColor: 'gray' }}>
      PNG/JPEG/WebP
    </Node>
    <Node id="native" position={[200, 54]} style={{ stroke: 'none', textColor: 'gray' }}>
      Native (Skia/RN) / PDF
    </Node>

    <Node id="persist" position={[-40, 80]} style={{ stroke: 'none' }}>
      persistence / edit
    </Node>

    <Draw way={['sugar', 'ir']} arrow="->" />
    <Draw way={['kernel', 'ir']} arrow="->" />
    <Draw way={['dsl', 'ir']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['ai', 'ir']} arrow="->" />

    <Draw way={['ir', 'scene']} arrow="->" />

    <Draw way={['scene', 'react']} arrow="->" />
    <Draw way={['scene', 'svg']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['scene', 'canvas']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['canvas', 'raster']} arrow="->" style={{ stroke: 'gray' }} />
    <Draw way={['scene', 'native']} arrow="->" style={{ stroke: 'gray' }} />

    <Draw way={['ir', 'persist']} arrow="<->" />
  </Layout>
);

export default Demo;
