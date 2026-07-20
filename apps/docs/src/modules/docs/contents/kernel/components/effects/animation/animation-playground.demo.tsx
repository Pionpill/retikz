import type { IRAnimationOrigin, IRAnimationTrack } from '@retikz/core';
import type { FC } from 'react';

import { scaleIn } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { animationPlaygroundControls } from './animation-playground.controls';

export const previewControls = animationPlaygroundControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 固定一个 scaleIn，让面板集中探索专有项、公共时序与支点 */
const Demo: FC = () => {
  const values = usePreviewControls(animationPlaygroundControls);
  const animation = scaleIn({
    from: values.from,
    duration: values.duration,
    delay: values.delay,
    easing: values.easing as IRAnimationTrack['easing'],
    origin: values.origin as IRAnimationOrigin,
  });
  const replayKey = `${values.from}-${values.duration}-${values.delay}-${values.easing}-${values.origin}`;

  return (
    <Layout key={replayKey} width={220} height={150} viewBox={{ x: -110, y: -75, width: 220, height: 150 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        fill="#f97316"
        textColor="white"
        padding={{ x: 28, y: 18 }}
        animations={[animation]}
      >
        scaleIn
      </Node>
    </Layout>
  );
};

export default Demo;
