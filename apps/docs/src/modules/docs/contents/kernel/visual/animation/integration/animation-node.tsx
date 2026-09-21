import { fadeIn, slideIn } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import { pulse } from '@retikz/standard';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { animationNodeI18n } from './animation-node.i18n';

/** 节点动画示例的语言参数 */
export type AnimationNodeProps = { lang?: Lang };
/** Text-bearing nodes animate their shape, text, and labels together */
const AnimationNode: FC<AnimationNodeProps> = props => {
  const { lang = 'zh' } = props;
  const text = animationNodeI18n[lang];
  return (
    <Layout viewBox={{ x: -245, y: -95, width: 490, height: 185 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[-115, -72]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
        {text.entrance}
      </Node>
      <Node position={[115, -72]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
        {text.emphasis}
      </Node>
      <Node
        id="entrance-node"
        position={[-115, 15]}
        shape="rectangle"
        label={{ text: text.label, position: 'top' }}
        layout={{ minimumSize: { width: 104, height: 56 } }}
        style={{ fill: 'dodgerblue', fillOpacity: 0.25, stroke: 'dodgerblue' }}
        animations={[fadeIn({ duration: 2400 }), slideIn({ axis: 'x', offset: -35, duration: 2400 })]}
      >
        {text.node}
      </Node>
      <Node
        id="emphasis-node"
        position={[115, 15]}
        shape="rectangle"
        label={{ text: text.label, position: 'top' }}
        layout={{ minimumSize: { width: 104, height: 56 } }}
        style={{ fill: 'darkorange', fillOpacity: 0.25, stroke: 'darkorange' }}
        animations={[pulse({ peak: 1.12, duration: 1800 })]}
      >
        {text.node}
      </Node>
    </Layout>
  );
};
export default AnimationNode;
