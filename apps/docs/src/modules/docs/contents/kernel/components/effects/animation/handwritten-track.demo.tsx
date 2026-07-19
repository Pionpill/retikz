import type { IRAnimationTrack } from '@retikz/core';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

const bounceTrack = {
  property: 'translateY',
  keyframes: [
    { at: 0, value: 0 },
    { at: 0.5, value: -34, easing: 'ease-out' },
    { at: 1, value: 0, easing: 'ease-in' },
  ],
  duration: 1200,
} satisfies IRAnimationTrack;

/** 三个绝对值关键帧组成一条可序列化轨道，末帧回到静止值 */
const Demo: FC = () => (
  <Layout width={220} height={150} viewBox={{ x: -110, y: -90, width: 220, height: 150 }}>
    <Node position={[0, 16]} shape="circle" minimumSize={70} fill="#f97316" animations={[bounceTrack]}>
      track
    </Node>
  </Layout>
);

export default Demo;
