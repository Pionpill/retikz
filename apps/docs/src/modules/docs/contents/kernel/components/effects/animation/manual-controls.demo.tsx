import type { IRAnimationTrack } from '@retikz/core';
import type { AnimationControls } from '@retikz/render/animation';
import type { FC } from 'react';

import { AnimationModeProvider, Layout, Node } from '@retikz/react';
import { useRef } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

const manualTrack = {
  property: 'translateX',
  keyframes: [
    { at: 0, value: -70 },
    { at: 0.5, value: 70 },
    { at: 1, value: -70 },
  ],
  duration: 1200,
  easing: 'ease-in-out',
  trigger: 'manual',
} satisfies IRAnimationTrack;

/** 用 Layout 的 scene 级句柄驱动 manual 轨道 */
const Demo: FC = () => {
  const animationRef = useRef<AnimationControls | null>(null);

  const replay = (): void => {
    animationRef.current?.pause();
    animationRef.current?.seek(0);
    animationRef.current?.play();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimationModeProvider mode="enabled">
        <Layout
          animationRef={animationRef}
          width={280}
          height={120}
          viewBox={{ x: -140, y: -60, width: 280, height: 120 }}
        >
          <Node position={[0, 0]} shape="circle" minimumSize={58} fill="#2563eb" animations={[manualTrack]}>
            manual
          </Node>
        </Layout>
      </AnimationModeProvider>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="rounded-md border px-3 py-1.5 text-sm" onClick={replay}>
          play()
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => animationRef.current?.pause()}
        >
          pause()
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm"
          onClick={() => animationRef.current?.seek(600)}
        >
          seek(600)
        </button>
      </div>
    </div>
  );
};

export default Demo;
