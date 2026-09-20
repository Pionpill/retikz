import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { animationSamplesI18n } from './animation-samples.i18n';

/** 时间采样图的语言参数 */
export type AnimationSamplesProps = { lang?: Lang };
/** 用同一轨道的四个固定时刻对照基础状态与动画值 */
const AnimationSamples: FC<AnimationSamplesProps> = props => {
  const { lang = 'zh' } = props;
  const text = animationSamplesI18n[lang];
  const times = [100, 200, 700, 1200];
  const values = times.map(time => (time < 200 ? 1 : 0.2 + 0.8 * Math.min(1, (time - 200) / 1000)));
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {times.map((time, index) => (
        <Scope key={time}>
          <Node position={[index * 168, -58]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {'t = ' + time + 'ms'}
          </Node>
          <Node
            position={[index * 168, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 76, height: 56 } }}
            style={{ stroke: 'none', fill: 'dodgerblue', opacity: values[index] }}
          />
          <Draw
            way={[
              [index * 168 - 38, -28],
              [index * 168 + 38, -28],
              [index * 168 + 38, 28],
              [index * 168 - 38, 28],
              [index * 168 - 38, -28],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Node
            position={[index * 168, 57]}
            style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}
          >
            {text.states[index]}
          </Node>
        </Scope>
      ))}
      <Draw
        way={[
          [168, 100],
          {
            label: {
              text: text.operation,
              position: 'midway',
              side: 'bottom',
              sloped: false,
              textColor: 'gray',
              font: { size: 12 },
            },
          },
          [336, 100],
        ]}
        arrow="->"
        style={{ stroke: 'gray' }}
      />
    </Layout>
  );
};
export default AnimationSamples;
