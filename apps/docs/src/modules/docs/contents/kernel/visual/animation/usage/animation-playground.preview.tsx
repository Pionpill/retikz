import type { IRAnimationOrigin, IRAnimationTrack } from '@retikz/core';
import { scaleIn } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

/** 图形参数 */
export type AnimationPlaygroundPreviewValues = {
  from: number;
  duration: number;
  delay: number;
  easing: 'ease-out' | 'linear' | 'ease-in' | 'ease-in-out';
  origin: 'center' | 'top' | 'right' | 'bottom' | 'left';
};

/** 绘制示例图形 */
export const AnimationPlaygroundPreview = (values: AnimationPlaygroundPreviewValues) => {
  const animation = scaleIn({
    from: values.from,
    duration: values.duration,
    delay: values.delay,
    easing: values.easing as IRAnimationTrack['easing'],
    origin: values.origin as IRAnimationOrigin,
  });
  const replayKey = `${values.from}-${values.duration}-${values.delay}-${values.easing}-${values.origin}`;

  return (
    <Layout key={replayKey} viewBox={{ x: -110, y: -75, width: 220, height: 150 }}>
      <Node
        position={[0, 0]}
        shape="rectangle"
        animations={[animation]}
        style={{ fill: '#f97316', textColor: 'white' }}
        layout={{ padding: { x: 28, y: 18 } }}
      >
        scaleIn
      </Node>
    </Layout>
  );
};
