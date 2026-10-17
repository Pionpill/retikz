import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { outputCanvasI18n } from './output-canvas.i18n';

/** 编译产物示意图 */
export type OutputCanvasProps = { lang?: Lang };
/** 编译产物示意图 */
const Figure: FC<OutputCanvasProps> = props => {
  const { lang = 'zh' } = props;
  const t = outputCanvasI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {t.titles.map((title, index) => (
        <Scope key={title} position={[index * 320, 0]}>
          <Node position={[150, -20]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          {[40, 160].map(x => (
            <Path key={x} style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
              <Step kind="move" to={[x, 60]} />
              <Step kind="line" to={[x + 80, 60]} />
              <Step kind="line" to={[x + 80, 100]} />
              <Step kind="line" to={[x, 100]} />
              <Step kind="cycle" />
            </Path>
          ))}
          <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
            <Step kind="move" to={index === 0 ? [20, 40] : [0, 20]} />
            <Step kind="line" to={index === 0 ? [260, 40] : [300, 20]} />
            <Step kind="line" to={index === 0 ? [260, 120] : [300, 140]} />
            <Step kind="line" to={index === 0 ? [20, 120] : [0, 140]} />
            <Step kind="cycle" />
          </Path>
          <Node position={[150, 172]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
            {index === 0 ? '(10, 20) · 120 × 40' : '(0, 10) · 150 × 60'}
          </Node>
        </Scope>
      ))}
      <Node position={[310, 210]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {t.note}
      </Node>
    </Layout>
  );
};
export default Figure;
