import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { copy } from './flow-bend-screening.i18n';
import { bendFigureBounds, bendFigureCurve, bendObstacles } from './flow-bend-subdivision.data';

/** 示意图语言 */
export type FlowBendScreeningProps = Readonly<{ lang?: Lang }>;

/** 同一几何实例的连续判定快照 */
const FlowBendScreening: FC<FlowBendScreeningProps> = props => {
  const { lang = 'zh' } = props;
  const t = copy[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {t.stages.map((title, stage) => {
        const divisions = stage === 0 ? 1 : 8;
        return (
          <Scope key={title} transforms={[{ kind: 'translate', x: stage * 250, y: 0 }]}>
            <Node position={[100, 0]} text={title} style={{ stroke: 'none', font: { size: 14 } }} />
            {stage < 2 &&
              Array.from({ length: divisions }, (_, index) => {
                const box = bendFigureBounds(index / divisions, (index + 1) / divisions);
                const overlaps = bendObstacles.some(
                  node =>
                    box.x <= node.x + node.width &&
                    node.x <= box.x + box.width &&
                    box.y <= node.y + node.height &&
                    node.y <= box.y + box.height,
                );
                return (
                  <Path
                    key={index}
                    style={{
                      fill: 'none',
                      stroke: overlaps ? 'darkorange' : 'gray',
                      dashPattern: overlaps ? [4, 3] : [1, 4],
                      lineCap: 'round',
                    }}
                  >
                    <Step kind="rectangle" from={[box.x, box.y]} to={[box.x + box.width, box.y + box.height]} />
                  </Path>
                );
              })}
            {(stage === 2 ? [30, 45, 60] : [60]).flatMap(angle =>
              (stage === 2 ? (['left', 'right'] as const) : (['left'] as const)).map(direction => {
                const segment = bendFigureCurve(angle, direction);
                const selected = stage !== 2 || (angle === 30 && direction === 'right');
                return (
                  <Path
                    key={`${direction}-${angle}`}
                    style={{
                      stroke: selected ? 'dodgerblue' : 'gray',
                      strokeWidth: selected ? 2 : 1,
                      ...(selected ? {} : { dashPattern: [1, 4], lineCap: 'round' as const }),
                    }}
                  >
                    <Step kind="move" to={segment.from} />
                    <Step kind="cubic" control1={segment.control1} control2={segment.control2} to={segment.to} />
                  </Path>
                );
              }),
            )}
            {bendObstacles.map(box => (
              <Node
                key={box.id}
                position={[box.x + box.width / 2, box.y + box.height / 2]}
                text={box.id}
                layout={{ width: box.width, minimumSize: { height: box.height }, padding: 0 }}
                style={{ fill: 'none', font: { size: 10 } }}
              />
            ))}
            <Node
              position={[100, 192]}
              text={t.notes[stage]}
              style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
            />
          </Scope>
        );
      })}
      {[0, 1].map(stage => (
        <Draw
          key={stage}
          way={[
            [214 + stage * 250, 110],
            [236 + stage * 250, 110],
          ]}
          arrow="->"
        />
      ))}
      <Node position={[350, 225]} text={t.legend} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
      <Node position={[350, 251]} text={t.detail} style={{ stroke: 'none', font: { size: 12 } }} />
    </Layout>
  );
};

export default FlowBendScreening;
