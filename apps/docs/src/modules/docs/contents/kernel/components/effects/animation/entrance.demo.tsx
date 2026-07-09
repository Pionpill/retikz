import type { FC } from 'react';

import { drawOn, fadeIn, grow, growUp, scaleIn, slideIn } from '@retikz/core';
import { Layout, Node, Path, Step } from '@retikz/react';

// 入场合集：fadeIn / scaleIn / grow / slideIn / growUp 各一个节点 + drawOn 一条路径，加载时各播一次
const Demo: FC = () => (
  <Layout width={460} height={210}>
    <Node id="fade" position={[-170, -55]} fill="#3b82f6" animations={[fadeIn()]}>
      fadeIn
    </Node>
    <Node id="pop" position={[-70, -55]} fill="#8b5cf6" animations={[scaleIn()]}>
      scaleIn
    </Node>
    <Node id="grow" position={[30, -55]} fill="#f59e0b" animations={[grow()]}>
      grow
    </Node>
    <Node id="slide" position={[140, -55]} fill="#ec4899" animations={[slideIn({ axis: 'x', offset: -40 })]}>
      slideIn
    </Node>
    {/* growUp：scaleY 0→1，支点底边——柱状图从基线长出 */}
    <Node
      id="bar1"
      position={[-150, 55]}
      shape="rectangle"
      minimumSize={{ width: 24, height: 36 }}
      fill="#0ea5e9"
      animations={[growUp()]}
    />
    <Node
      id="bar2"
      position={[-110, 45]}
      shape="rectangle"
      minimumSize={{ width: 24, height: 56 }}
      fill="#0ea5e9"
      animations={[growUp()]}
    />
    <Node id="a" position={[-40, 60]}>
      a
    </Node>
    <Node id="b" position={[160, 60]}>
      b
    </Node>
    <Path stroke="#10b981" strokeWidth={3} animations={[drawOn()]}>
      <Step kind="move" to="a" />
      <Step kind="line" to={[60, 60]} />
      <Step kind="line" to="b" />
    </Path>
  </Layout>
);

export default Demo;
