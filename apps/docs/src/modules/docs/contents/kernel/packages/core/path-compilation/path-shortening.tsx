import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathShorteningI18n } from './path-shortening.i18n';

/** 端点缩短图的语言 */
export type PathShorteningProps = { lang?: Lang };

/** 用命令改写后的几何对照贝塞尔与圆弧的缩短结果 */
const PathShortening: FC<PathShorteningProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathShorteningI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 330, 0]}>
          <Node position={[90, -150]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Path style={{ stroke: 'gray', strokeWidth: 2 }}>
            <Step kind="move" to={[0, 0]} />
            {i === 0 ? (
              <Step kind="curve" control={[90, -100]} to={[180, 0]} />
            ) : (
              <Step kind="arc" center={[90, 0]} radius={90} startAngle={-180} endAngle={0} />
            )}
          </Path>
          <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }} marks={[{ pos: 1 }]}>
            <Step kind="move" to={[0, 0]} />
            {i === 0 ? (
              <Step kind="curve" control={[90, -100]} to={[180, 0]} />
            ) : (
              <Step kind="arc" center={[90, 0]} radius={90} startAngle={-180} endAngle={0} />
            )}
          </Path>
          {i === 0 && (
            <>
              <Node
                position={[90, -100]}
                shape="circle"
                layout={{ minimumSize: 5, padding: 0 }}
                style={{ fill: 'gray', stroke: 'none' }}
              />
              <Node
                position={[90, -119]}
                style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}
              >
                {text.control}
              </Node>
            </>
          )}
          <Node position={[0, 15]} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}>
            A
          </Node>
          <Node position={[190, 15]} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}>
            B
          </Node>
          <Node position={[90, 48]} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}>
            {text.notes[i]}
          </Node>
        </Scope>
      ))}
      <Node position={[255, 82]} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}>
        {text.legend}
      </Node>
    </Layout>
  );
};
export default PathShortening;
