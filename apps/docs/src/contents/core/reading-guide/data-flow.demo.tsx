import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Source-guide 数据流向插图（dogfood）
 * @description 顶行 JSX/DSL → parsers → IR → compile → Scene → adapter renderer；底行各阶段背后的模块来源，geometry/* 与 compile 之间用虚线表示"被调用"；节点纯当文字锚点 stroke="none"，Draw 仍按 Node bbox 自动贴边。
 */
const Demo: FC = () => (
  <TikZ width={660} height={150} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="jsx" position={[-300, 0]} stroke="none">
      JSX / DSL
    </Node>
    <Node id="parsers" position={[-195, 0]} stroke="none">
      parsers
    </Node>
    <Node id="ir" position={[-110, 0]} stroke="none">
      IR
    </Node>
    <Node id="compile" position={[0, 0]} stroke="none">
      compile
    </Node>
    <Node id="scene" position={[110, 0]} stroke="none">
      Scene
    </Node>
    <Node id="adapter" position={[240, 0]} stroke="none">
      adapter renderer
    </Node>

    <Draw way={['jsx', 'parsers']} arrow="->" />
    <Draw way={['parsers', 'ir']} arrow="->" />
    <Draw way={['ir', 'compile']} arrow="->" />
    <Draw way={['compile', 'scene']} arrow="->" />
    <Draw way={['scene', 'adapter']} arrow="->" />

    <Node id="ir_schema" position={[-110, 90]} stroke="none">
      ir/* schema
    </Node>
    <Node id="geometry" position={[0, 90]} stroke="none">
      geometry/*
    </Node>
    <Node id="primitive" position={[110, 90]} stroke="none">
      primitive/*
    </Node>
    <Node id="react" position={[240, 90]} stroke="none">
      @retikz/react
    </Node>

    <Draw way={['ir_schema', 'ir']} arrow="->" />
    <Draw way={['geometry', 'compile']} arrow="->" strokeDasharray="4 3" />
    <Draw way={['primitive', 'scene']} arrow="->" />
    <Draw way={['react', 'adapter']} arrow="->" />
  </TikZ>
);

export default Demo;
