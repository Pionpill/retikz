import type { IRAnimationTrack } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import type { AnimationPropertyDefinition } from '@retikz/react';
import type { FC } from 'react';

// 自定义属性通道 'blur'：interpolate 线性插值、applyCanvas 写 ctx.filter。仅 Canvas 生效，故 renderer="canvas"。
const blur: AnimationPropertyDefinition = {
  interpolate: (from, to, t) => (from as number) + ((to as number) - (from as number)) * t,
  applyCanvas: (ctx, _prim, value) => {
    ctx.filter = `blur(${value as number}px)`;
  },
};

// 入场去焦：blur 8→0（末帧 0 = 清晰 = base）
const blurIn: IRAnimationTrack = {
  property: 'blur',
  keyframes: [{ at: 0, value: 8 }, { at: 1, value: 0 }],
  duration: 800,
};

const Demo: FC = () => (
  <Layout renderer="canvas" width={160} height={100} animationProperties={{ blur }}>
    <Node id="a" position={[0, 0]} fill="#3b82f6" animations={[blurIn]}>
      blur
    </Node>
  </Layout>
);

export default Demo;
