import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * "IR at the Center" diagram for the introduction page
 * @description 4 inputs → IR ↔ Scene → 4 outputs (hourglass); nodes use stroke="none" as text anchors with Draw still snapping to bbox; bidirectional arrow between IR and "persistence / edit" marks IR as a read/write durable layer.
 *   Shipped parts use the default color (currentColor); planned / unsupported capabilities are dimmed to gray and explained by an in-diagram legend.
 */
const Demo: FC = () => (
  <Layout width={640} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="sugar" position={[-160, -54]} stroke="none">
      Sugar JSX
    </Node>
    <Node id="kernel" position={[-160, -18]} stroke="none">
      Kernel JSX
    </Node>
    <Node id="dsl" position={[-160, 18]} stroke="none" textColor="gray">
      Text DSL*
    </Node>
    <Node id="ai" position={[-160, 54]} stroke="none">
      AI / LLM
    </Node>

    <Node id="ir" position={[-40, 0]} stroke="none">
      IR (JSON)
    </Node>
    <Node id="scene" position={[60, 0]} stroke="none">
      Scene
    </Node>

    <Node id="react" position={[200, -54]} stroke="none">
      React + SVG
    </Node>
    <Node id="svg" position={[200, -18]} stroke="none">
      pure SVG string
    </Node>
    <Node id="canvas" position={[200, 18]} stroke="none">
      Canvas
    </Node>
    <Node id="raster" position={[350, 18]} stroke="none" textColor="gray">
      PNG/JPEG/WebP
    </Node>
    <Node id="native" position={[200, 54]} stroke="none" textColor="gray">
      Native (Skia/RN) / PDF
    </Node>

    <Node id="persist" position={[-40, 80]} stroke="none">
      persistence / edit
    </Node>
    <Node id="legend" position={[60, 104]} stroke="none" textColor="gray" font={{ size: 12 }}>
      gray = planned, not shipped yet
    </Node>

    <Draw way={['sugar', 'ir']} arrow="->" />
    <Draw way={['kernel', 'ir']} arrow="->" />
    <Draw way={['dsl', 'ir']} arrow="->" stroke="gray" />
    <Draw way={['ai', 'ir']} arrow="->" />

    <Draw way={['ir', 'scene']} arrow="->" />

    <Draw way={['scene', 'react']} arrow="->" />
    <Draw way={['scene', 'svg']} arrow="->" />
    <Draw way={['scene', 'canvas']} arrow="->" />
    <Draw way={['canvas', 'raster']} arrow="->" stroke="gray" />
    <Draw way={['scene', 'native']} arrow="->" stroke="gray" />

    <Draw way={['ir', 'persist']} arrow="<->" />
  </Layout>
);

export default Demo;
