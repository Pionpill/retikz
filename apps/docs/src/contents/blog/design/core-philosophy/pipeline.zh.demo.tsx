import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 核心理念文章插图：IR 居中的流水线
 * @description 与 /core/introduction 的 ir-centric 图对齐——4 路输入 → IR ↔ Scene → 4 路输出（hourglass），所有节点 stroke="none" 当文字锚点，Draw 按 bbox 自动贴边；IR 与"持久化 / 编辑"双向箭头表示 IR 是可读写持久层。
 */
const Demo: FC = () => (
  <TikZ width={640} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
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
  </TikZ>
);

export default Demo;
