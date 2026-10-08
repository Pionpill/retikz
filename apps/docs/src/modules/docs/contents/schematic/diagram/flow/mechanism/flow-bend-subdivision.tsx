import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { bendFigureBounds, bendFigureCurve, bendObstacles } from './flow-bend-subdivision.data';
import { copy } from './flow-bend-subdivision.i18n';

/** 示意图语言 */
export type FlowBendSubdivisionProps = Readonly<{ lang?: Lang }>;

/** 同一几何实例的连续判定快照 */
const FlowBendSubdivision: FC<FlowBendSubdivisionProps> = props => {
  const { lang = 'zh' } = props;
  const t = copy[lang];
  const segment = bendFigureCurve();

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {t.stages.map((title, stage) => {
        const divisions = [1, 2, 8][stage];
        return (
          <Scope key={title} position={[stage * 250, 0]}>
            <Node position={[100, 0]} text={title} style={{ stroke: 'none', font: { size: 14 } }} />
            {Array.from({ length: divisions }, (_, index) => {
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
            <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
              <Step kind="move" to={segment.from} />
              <Step kind="cubic" control1={segment.control1} control2={segment.control2} to={segment.to} />
            </Path>
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
      <Node position={[350, 225]} text={t.legend} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
      <Node position={[350, 251]} text={t.detail} style={{ stroke: 'none', font: { size: 12 } }} />
    </Layout>
  );
};

export default FlowBendSubdivision;
