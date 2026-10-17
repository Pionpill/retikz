import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { outputSpatialI18n } from './output-spatial.i18n';

/** 编译产物示意图 */
export type OutputSpatialProps = { lang?: Lang };
/** 编译产物示意图 */
const Figure: FC<OutputSpatialProps> = props => {
  const { lang = 'zh' } = props;
  const t = outputSpatialI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[t.local, t.world].map((title, index) => (
        <Scope key={title} position={[index * 360, 0]}>
          <Node position={[120, -35]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
            <Step kind="move" to={[0, 140]} />
            <Step kind="line" to={[0, 0]} />
            <Step kind="line" to={[260, 0]} />
          </Path>
          <Node position={[-15, -10]} style={{ stroke: 'none', fill: 'none', font: { size: 12 }, textColor: 'gray' }}>
            0
          </Node>
          <Path style={{ stroke: 'darkorange', strokeWidth: 2 }}>
            <Step kind="move" to={[index * 40, index * 60]} />
            <Step kind="line" to={[index * 40 + 200, index * 60]} />
            <Step kind="line" to={[index * 40 + 200, index * 60 + 40]} />
            <Step kind="line" to={[index * 40, index * 60 + 40]} />
            <Step kind="cycle" />
          </Path>
          <Node position={[120, 160]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
            {index === 0 ? '(0, 0) · 100 × 20' : '(20, 30) · 100 × 20'}
          </Node>
        </Scope>
      ))}
      <Path
        way={[
          [250, 65],
          [350, 65],
        ]}
        arrow="->"
        label={{ text: t.shift, font: { size: 12 }, textColor: 'gray' }}
      />
      <Node position={[300, 205]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {t.note}
      </Node>
    </Layout>
  );
};
export default Figure;
