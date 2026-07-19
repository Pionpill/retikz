import type { IRAnimationTrack } from '@retikz/core';
import type { AnimationPropertyDefinition } from '@retikz/render/animation';
import type { FC } from 'react';

import { buildIR, Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { customPropertyControls, previewControlContract } from './custom-property.controls';

// 自定义属性通道 'blur'：interpolate 线性插值、applyCanvas 写 ctx.filter。仅 Canvas 生效，故 renderer="canvas"。
const blur: AnimationPropertyDefinition = {
  interpolate: (from, to, t) => (from as number) + ((to as number) - (from as number)) * t,
  applyCanvas: (ctx, _prim, value) => {
    ctx.filter = `blur(${value as number}px)`;
  },
};

/** 创建从指定模糊值过渡到清晰状态的轨道 */
const createBlurIn = (from: number, duration: number): IRAnimationTrack => ({
  property: 'blur',
  keyframes: [
    { at: 0, value: from },
    { at: 1, value: 0 },
  ],
  duration,
});

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 源码面板使用 canonical 状态生成 IR 与 Vanilla，避免执行带 hook 的交互组件 */
export const previewIR = buildIR(
  <Node
    id="a"
    position={[0, 0]}
    fill="#3b82f6"
    animations={[
      createBlurIn(previewControlContract.canonicalValues.blur, previewControlContract.canonicalValues.duration),
    ]}
  >
    blur
  </Node>,
);

const Demo: FC = () => {
  const values = usePreviewControls(customPropertyControls);
  const blurIn = createBlurIn(values.blur, values.duration);
  const replayKey = `${values.blur}-${values.duration}`;

  return (
    <Layout key={replayKey} renderer="canvas" width={160} height={100} animationProperties={{ blur }}>
      <Node id="a" position={[0, 0]} fill="#3b82f6" animations={[blurIn]}>
        blur
      </Node>
    </Layout>
  );
};

export default Demo;
