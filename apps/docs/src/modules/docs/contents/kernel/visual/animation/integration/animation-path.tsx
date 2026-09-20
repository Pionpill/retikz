import { drawOn } from '@retikz/core';
import { Layout, Node, Path, Step } from '@retikz/react';
import { wiggle } from '@retikz/standard';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { animationPathI18n } from './animation-path.i18n';

/** 路径动画示例的语言参数 */
export type AnimationPathProps = { lang?: Lang };
/** Stroke reveal and rotation leave independently emitted labels unchanged */
const AnimationPath: FC<AnimationPathProps> = props => {
  const { lang = 'zh' } = props;
  const text = animationPathI18n[lang];
  return (
    <Layout viewBox={{ x: -255, y: -100, width: 510, height: 195 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[-140, -74]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
        {text.draw}
      </Node>
      <Node position={[140, -74]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
        {text.rotate}
      </Node>
      <Path
        id="draw-path"
        style={{ stroke: 'dodgerblue', strokeWidth: 3, fill: 'none' }}
        label={{ text: text.label, side: 'top', position: 'midway', sloped: false }}
        animations={[drawOn({ duration: 3000, easing: 'linear' })]}
      >
        <Step kind="move" to={[-220, 30]} />
        <Step kind="line" to={[-175, -5]} />
        <Step kind="line" to={[-120, 30]} />
        <Step kind="line" to={[-65, -5]} />
      </Path>
      <Path
        id="wiggle-path"
        arrow="->"
        style={{ stroke: 'darkorange', strokeWidth: 3, fill: 'none' }}
        label={{ text: text.label, side: 'top', position: 'midway', sloped: false }}
        animations={[wiggle({ angle: 12, duration: 2400, iterations: 'infinite' })]}
      >
        <Step kind="move" to={[60, 25]} />
        <Step kind="line" to={[130, -5]} />
        <Step kind="line" to={[210, 25]} />
      </Path>
    </Layout>
  );
};
export default AnimationPath;
