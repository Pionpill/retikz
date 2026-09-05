import type { FC } from 'react';

import { blink, colorShift, flash, loop, pulse, slideIn, spin, wiggle } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

// 强调与循环合集：flash / blink / wiggle 强调，pulse / spin 循环，loop 包装 slideIn，colorShift 变色
const Demo: FC = () => (
  <Layout width={460} height={210}>
    <Node id="flash" position={[-170, -55]} animations={[flash()]} style={{ fill: '#f59e0b' }}>
      flash
    </Node>
    <Node id="blink" position={[-70, -55]} animations={[blink()]} style={{ fill: '#ef4444' }}>
      blink
    </Node>
    <Node id="wiggle" position={[30, -55]} animations={[wiggle()]} style={{ fill: '#8b5cf6' }}>
      wiggle
    </Node>
    <Node id="live" position={[140, -55]} animations={[pulse()]} style={{ fill: '#ef4444' }}>
      pulse
    </Node>
    {/* spin：rotate 0→360 无限匀速；纯形状，无文字 */}
    <Node
      id="spin"
      position={[-150, 55]}
      shape="rectangle"
      animations={[spin()]}
      style={{ fill: '#6366f1' }}
      layout={{ minimumSize: { width: 56, height: 16 } }}
    />
    {/* loop：把一次性 slideIn 变成往返无限循环 */}
    <Node
      id="loop"
      position={[20, 55]}
      animations={[loop(slideIn({ axis: 'x', offset: -40 }), { direction: 'alternate' })]}
      style={{ fill: '#0ea5e9' }}
    >
      loop
    </Node>
    {/* colorShift：纯形状的 fill 在 oklch 空间从红渐变到蓝（末帧 = base 色） */}
    <Node
      id="color"
      position={[160, 55]}
      shape="rectangle"
      animations={[colorShift({ from: '#ef4444', to: '#3b82f6' })]}
      style={{ fill: '#3b82f6' }}
      layout={{ minimumSize: { width: 48, height: 36 } }}
    />
  </Layout>
);

export default Demo;
