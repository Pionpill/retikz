import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 运行时管线示意
 * @description 主流程 JSX → IR → Scene → SVG / Canvas / …。灰色备注在下方标出 Parser（sugar→IR）、
 *   Compile（IR→Scene）、Primitive（Scene 图元）、render（Scene→渲染目标，@retikz/react）分别在哪起作用。
 *   纯技术 label，单文件共用。
 */
const Demo: FC = () => (
  <TikZ width={680} height={190}>
    {/* 主流程 */}
    <Node id="jsx" position={[-300, 0]} stroke="none">
      JSX
    </Node>
    <Node id="ir" position={[-175, 0]} stroke="none">
      IR
    </Node>
    <Node id="scene" position={[-30, 0]} stroke="none">
      Scene
    </Node>
    <Node id="target" position={[215, 0]} stroke="none">
      SVG / Canvas / …
    </Node>
    <Draw way={['jsx', 'ir']} arrow="->" />
    <Draw way={['ir', 'scene']} arrow="->" />
    <Draw way={['scene', 'target']} arrow="->" />

    {/* 灰色备注：备注在下方、箭头朝上 */}
    <Node id="capParser" position={[-238, 60]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Parser
    </Node>
    <Draw way={[[-238, 42], [-238, 8]]} arrow="->" stroke="gray" />

    <Node id="capCompile" position={[-103, 60]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Compile
    </Node>
    <Draw way={[[-103, 42], [-103, 8]]} arrow="->" stroke="gray" />

    <Node id="capPrimitive" position={[-30, 60]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      Primitive
    </Node>
    <Draw way={[[-30, 42], 'scene']} arrow="->" stroke="gray" />

    <Node id="capRender" position={[65, 60]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      {['render', '@retikz/react']}
    </Node>
    <Draw way={[[65, 42], [65, 8]]} arrow="->" stroke="gray" />
  </TikZ>
);

export default Demo;
