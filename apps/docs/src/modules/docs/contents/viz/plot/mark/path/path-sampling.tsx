import type { Position } from '@retikz/math';
import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathSamplingI18n } from './path-sampling.i18n';

/** 采样示意图语言 */
export type PathSamplingProps = { lang?: Lang };

/** 对照相同端点的弦连接与极坐标采样折线 */
const PathSampling: FC<PathSamplingProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathSamplingI18n[lang];
  const radius = 120;
  const point = (offset: number, fraction: number): Position => {
    const angle = (fraction * Math.PI) / 2;
    return [offset + radius * Math.cos(angle), 65 + radius * Math.sin(angle)];
  };

  return (
    <Layout viewBox={{ x: 0, y: 0, width: 640, height: 240 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {[0, 1].map(panel => {
        const offset = panel * 320 + 100;
        const fractions = panel === 0 ? [0, 1] : Array.from({ length: 7 }, (_, index) => index / 6);
        return (
          <>
            <Node
              key={`title-${panel}`}
              position={[panel * 320 + 160, 25]}
              shape="rectangle"
              text={panel === 0 ? text.chord : text.sampled}
              style={{ stroke: 'none', fill: 'none' }}
            />
            <Path key={`reference-${panel}`} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
              <Step kind="move" to={point(offset, 0)} />
              {Array.from({ length: 60 }, (_, index) => (
                <Step key={index} to={point(offset, (index + 1) / 60)} />
              ))}
            </Path>
            <Path key={`line-${panel}`} style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
              <Step kind="move" to={point(offset, 0)} />
              {fractions.slice(1).map(fraction => (
                <Step key={fraction} to={point(offset, fraction)} />
              ))}
            </Path>
            {fractions.map(fraction => (
              <Node
                key={`${panel}-${fraction}`}
                position={point(offset, fraction)}
                shape="ellipse"
                layout={{ minimumSize: 8, padding: 0 }}
                style={{ fill: fraction === 0 || fraction === 1 ? 'darkorange' : 'dodgerblue', stroke: 'none' }}
              />
            ))}
            <Node
              key={`caption-${panel}`}
              position={[panel * 320 + 160, 220]}
              shape="rectangle"
              text={panel === 0 ? text.direct : text.segments}
              style={{ font: { size: 12 }, textColor: 'gray', stroke: 'none', fill: 'none' }}
            />
          </>
        );
      })}
    </Layout>
  );
};

export default PathSampling;
