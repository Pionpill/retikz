import { Layout, Node, Scope } from '@retikz/react';
import { blink, flash, grow, growUp, pulse, spin, wiggle } from '@retikz/standard';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { animationPresetsI18n } from './animation-presets.i18n';

/** 动画预设对照的语言参数 */
export type AnimationPresetsProps = { lang?: Lang };

/** 在相同几何图形上对照各预设的默认效果 */
const AnimationPresets: FC<AnimationPresetsProps> = props => {
  const { lang = 'zh' } = props;
  const tracks = [grow(), growUp(), pulse(), spin(), flash(), blink(), wiggle()];
  return (
    <Layout viewBox={{ x: -310, y: -110, width: 620, height: 260 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {tracks.map((track, index) => (
        <Scope
          key={index}
          transforms={[{ kind: 'translate', x: (index % 4) * 150 - 225, y: Math.floor(index / 4) * 125 - 35 }]}
        >
          <Node position={[0, -48]} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}>
            {animationPresetsI18n[lang][index]}
          </Node>
          <Node
            id={`effect-${index}`}
            shape="rectangle"
            position={[0, 0]}
            layout={{ minimumSize: { width: 50, height: 34 } }}
            style={{ fill: 'dodgerblue', fillOpacity: 0.3, stroke: 'dodgerblue' }}
            animations={[track]}
          />
        </Scope>
      ))}
    </Layout>
  );
};
export default AnimationPresets;
