import type { FC } from 'react';

import { blink, colorShift, flash, Layout, loop, Node, pulse, slideIn, spin, wiggle } from '@retikz/react';

// 强调与循环合集：flash / blink / wiggle 强调，pulse / spin 循环，loop 包装 slideIn，colorShift 变色
const Demo: FC = () => (
  <Layout width={460} height={210}>
    <Node id="flash" position={[-170, -55]} fill="#f59e0b" animations={[flash()]}>
      flash
    </Node>
    <Node id="blink" position={[-70, -55]} fill="#ef4444" animations={[blink()]}>
      blink
    </Node>
    <Node id="wiggle" position={[30, -55]} fill="#8b5cf6" animations={[wiggle()]}>
      wiggle
    </Node>
    <Node id="live" position={[140, -55]} fill="#ef4444" animations={[pulse()]}>
      pulse
    </Node>
    {/* spin：rotate 0→360 无限匀速；纯形状，无文字 */}
    <Node
      id="spin"
      position={[-150, 55]}
      shape="rectangle"
      minimumWidth={56}
      minimumHeight={16}
      fill="#6366f1"
      animations={[spin()]}
    />
    {/* loop：把一次性 slideIn 变成往返无限循环 */}
    <Node
      id="loop"
      position={[20, 55]}
      fill="#0ea5e9"
      animations={[loop(slideIn({ axis: 'x', offset: -40 }), { direction: 'alternate' })]}
    >
      loop
    </Node>
    {/* colorShift：纯形状的 fill 在 oklch 空间从红渐变到蓝（末帧 = base 色） */}
    <Node
      id="color"
      position={[160, 55]}
      shape="rectangle"
      minimumWidth={48}
      minimumHeight={36}
      fill="#3b82f6"
      animations={[colorShift({ from: '#ef4444', to: '#3b82f6' })]}
    />
  </Layout>
);

export default Demo;
