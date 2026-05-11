import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 简介页"IR 居中"插图：4 路输入 → IR ↔ Scene → 4 路输出（hourglass / 漏斗双扇）。
 * 节点全部 stroke="none" 当文字锚点；Draw 仍按 bbox 自动贴边。
 * "持久化 / 编辑" 与 IR 之间双向箭头表示 IR 是可读写持久层（与 AI / 编辑器循环同源）。
 */
const Demo: FC = () => (
  <Tikz width={640} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="sugar" position={[-160, -54]} stroke="none">
      Sugar JSX
    </Node>
    <Node id="kernel" position={[-160, -18]} stroke="none">
      Kernel JSX
    </Node>
    <Node id="dsl" position={[-160, 18]} stroke="none">
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
      pure SVG 字符串
    </Node>
    <Node id="canvas" position={[200, 18]} stroke="none">
      Canvas
    </Node>
    <Node id="raster" position={[350, 18]} stroke="none">
      PNG/JPEG/WebP
    </Node>
    <Node id="native" position={[200, 54]} stroke="none">
      Native (Skia/RN) / PDF
    </Node>

    <Node id="persist" position={[-40, 80]} stroke="none">
      持久化 / 编辑
    </Node>

    <Draw way={['sugar', 'ir']} arrow="->" />
    <Draw way={['kernel', 'ir']} arrow="->" />
    <Draw way={['dsl', 'ir']} arrow="->" />
    <Draw way={['ai', 'ir']} arrow="->" />

    <Draw way={['ir', 'scene']} arrow="->" />

    <Draw way={['scene', 'react']} arrow="->" />
    <Draw way={['scene', 'svg']} arrow="->" />
    <Draw way={['scene', 'canvas']} arrow="->" />
    <Draw way={['canvas', 'raster']} arrow="->" />
    <Draw way={['scene', 'native']} arrow="->" />

    <Draw way={['ir', 'persist']} arrow="<->" />
  </Tikz>
);

export default Demo;
