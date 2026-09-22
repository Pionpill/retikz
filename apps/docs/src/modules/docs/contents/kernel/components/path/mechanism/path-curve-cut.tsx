import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import { List } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathCurveCutI18n } from './path-curve-cut.i18n';
import { cutAfter, cutBefore, cutCurve, cutRemoved } from './path-cut.data';
/** 曲线保形截取图的语言 */
export type PathCurveCutProps = { lang?: Lang };
/** 对照完整曲线、切点与两个保持曲线类型的输出片段 */
const PathCurveCut: FC<PathCurveCutProps> = props => {
  const { lang = 'zh' } = props;
  const t = pathCurveCutI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {t.titles.map((title, index) => (
        <Scope key={title} localNamespace transforms={[{ kind: 'translate', x: index * 235, y: 0 }]}>
          <Node position={[90, -105]} text={title} style={{ stroke: 'none', font: { size: 14 } }} />
          {index < 2 && (
            <Path style={{ stroke: 'gray', strokeWidth: 2 }}>
              <Step kind="move" to={cutCurve.from} />
              <Step kind="curve" control={cutCurve.control} to={cutCurve.to} />
            </Path>
          )}
          {index === 1 && cutRemoved.kind === 'quadraticBezier' && (
            <>
              <Path style={{ stroke: 'dodgerblue', strokeWidth: 4 }}>
                <Step kind="move" to={cutRemoved.from} />
                <Step kind="curve" control={cutRemoved.control} to={cutRemoved.to} />
              </Path>
              {[cutRemoved.from, cutRemoved.to].map((point, i) => (
                <Node
                  key={i}
                  position={point}
                  shape="circle"
                  layout={{ minimumSize: 6, padding: 0 }}
                  style={{ stroke: 'none', fill: 'dodgerblue' }}
                  label={{ text: i === 0 ? 's₁' : 's₂', position: 'bottom', font: { size: 12 } }}
                />
              ))}
            </>
          )}
          {index === 2 && (
            <>
              {[cutBefore, cutAfter].map(
                (segment, i) =>
                  segment.kind === 'quadraticBezier' && (
                    <Path key={i} style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
                      <Step kind="move" to={segment.from} />
                      <Step kind="curve" control={segment.control} to={segment.to} />
                    </Path>
                  ),
              )}
              <Node position={[90, -50]} text="label" style={{ stroke: 'none', font: { size: 13 } }} />
            </>
          )}
          <Node position={[0, 20]} text="A" style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
          <Node position={[180, 20]} text="B" style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
        </Scope>
      ))}
      <List
        transforms={[{ kind: 'translate', x: 115, y: 120 }]}
        label={{ text: t.fragments, opacity: 0.8, font: { size: 12 } }}
        items={[{ content: `${t.left}: move → quad` }, { content: `${t.right}: move → quad` }]}
        style={{ font: { size: 13 } }}
        layout={{ width: 230, height: 36 }}
      />

      <Node position={[325, 205]} text={t.note} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
    </Layout>
  );
};
export default PathCurveCut;
