import type { IRAnimationTrack } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const tracks: Array<IRAnimationTrack> = [
  {
    property: 'fillOpacity',
    keyframes: [
      { at: 0, value: 0.2 },
      { at: 0.5, value: 1 },
      { at: 1, value: 0.2 },
    ],
    duration: 1600,
    iterations: 'infinite',
  },
  {
    property: 'strokeOpacity',
    keyframes: [
      { at: 0, value: 1 },
      { at: 0.5, value: 0.3 },
      { at: 1, value: 1 },
    ],
    duration: 1600,
    iterations: 'infinite',
  },
  {
    property: 'dashOffset',
    keyframes: [
      { at: 0, value: 0 },
      { at: 1, value: 12 },
    ],
    duration: 1000,
    iterations: 'infinite',
  },
];

/** 填充、描边透明度独立变化，虚线沿边界连续移动 */
const Demo: FC = () => (
  <Layout viewBox={{ x: -70, y: -70, width: 140, height: 140 }}>
    <Node
      position={[0, 0]}
      shape="rectangle"
      layout={{ minimumSize: 80 }}
      style={{ fill: '#38bdf8', stroke: '#0369a1', strokeWidth: 3, dashPattern: [8, 4] }}
      animations={tracks}
    />
  </Layout>
);

export default Demo;
