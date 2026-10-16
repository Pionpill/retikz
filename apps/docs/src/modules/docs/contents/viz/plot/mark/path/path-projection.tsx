import { pointAtArcAngle } from '@retikz/math';
import type { Position } from '@retikz/math';
import { Layout, Node, Path, Step } from '@retikz/react';
import { Fragment } from 'react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathProjectionI18n } from './path-projection.i18n';

/** 投影示意图语言 */
export type PathProjectionProps = { lang?: Lang };

/** 独立于绘制几何的图注 */
const caption = (text: string, position: Position, secondary = false) => (
  <Node
    position={position}
    shape="rectangle"
    text={text}
    style={{
      fill: 'none',
      stroke: 'none',
      textColor: secondary ? 'gray' : 'currentColor',
      font: { size: secondary ? 12 : 14 },
    }}
  />
);

/** 展示同一组位置的定位、绘制与细节处理 */
const PathProjection: FC<PathProjectionProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathProjectionI18n[lang];
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 750, height: 430 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {[0, 1, 2].map(stage => (
        <Fragment key={stage}>
          {caption(text.stages[stage], [stage * 250 + 125, 20])}
          {[false, true].map(polar => {
            const left = 30 + stage * 250;
            const center: Position = [left + 35, 365];
            const positions: Array<Position> = polar
              ? [-75, -42.5, -10].map(angle => pointAtArcAngle(center, 82, angle))
              : [
                  [left + 50, 170],
                  [left + 105, 105],
                  [left + 165, 150],
                ];
            // 每段插入三个示意采样点，原始顶点位于索引 0、4、8
            const route = polar
              ? Array.from({ length: 9 }, (_, index) => pointAtArcAngle(center, 82, -75 + (65 * index) / 8))
              : positions;
            return (
              <Fragment key={String(polar)}>
                {caption(polar ? text.polar : text.cartesian, [stage * 250 + 125, polar ? 236 : 50], true)}
                <Path style={{ stroke: 'gray' }}>
                  {polar ? (
                    <>
                      <Step kind="move" to={center} />
                      <Step to={[center[0] + 125, center[1]]} />
                      <Step kind="move" to={pointAtArcAngle(center, 110, -90)} />
                      <Step kind="arc" center={center} startAngle={-90} endAngle={0} radius={110} />
                    </>
                  ) : (
                    <>
                      <Step kind="move" to={[left + 20, 75]} />
                      <Step to={[left + 20, 200]} />
                      <Step to={[left + 185, 200]} />
                    </>
                  )}
                </Path>
                {caption(polar ? 'r' : 'x', polar ? [left + 174, 365] : [left + 195, 200], true)}
                {caption(polar ? 'θ' : 'y', polar ? [left + 23, 255] : [left + 20, 65], true)}
                {positions.map((position, index) => (
                  <Path key={index} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
                    {polar ? (
                      <>
                        <Step kind="move" to={center} />
                        <Step to={pointAtArcAngle(center, 110, [-75, -42.5, -10][index])} />
                        {index === 0 && (
                          <>
                            <Step kind="move" to={pointAtArcAngle(center, 82, -90)} />
                            <Step kind="arc" center={center} startAngle={-90} endAngle={0} radius={82} />
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <Step kind="move" to={[position[0], 200]} />
                        <Step to={position} />
                        <Step to={[left + 20, position[1]]} />
                      </>
                    )}
                  </Path>
                ))}
                {stage > 0 && (
                  <Path
                    label={
                      stage === 2
                        ? { text: text.label, side: 'top', sloped: true, textColor: 'currentColor', font: { size: 12 } }
                        : undefined
                    }
                    style={{
                      stroke: 'dodgerblue',
                      strokeWidth: stage === 2 ? 7 : 1.5,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  >
                    <Step kind="move" to={positions[0]} />
                    {route.slice(1).map((to, index) => (
                      <Step key={index} to={to} />
                    ))}
                  </Path>
                )}
                {polar &&
                  stage > 0 &&
                  route.map(
                    (position, index) =>
                      index % 4 !== 0 && (
                        <Node
                          key={index}
                          position={position}
                          shape="ellipse"
                          layout={{ minimumSize: { width: 4, height: 4 }, padding: 0 }}
                          style={{ fill: 'gray', stroke: 'none' }}
                        />
                      ),
                  )}
                {positions.map((position, index) => (
                  <Fragment key={index}>
                    <Node
                      position={position}
                      shape="ellipse"
                      layout={{ minimumSize: { width: 6, height: 6 }, padding: 0 }}
                      style={{ fill: 'darkorange', stroke: 'none' }}
                    />
                    {stage === 0 && caption(String(index + 1), [position[0] + 12, position[1] - 14], true)}
                  </Fragment>
                ))}
              </Fragment>
            );
          })}
          {caption(text.notes[stage], [stage * 250 + 125, 412], true)}
        </Fragment>
      ))}
    </Layout>
  );
};
export default PathProjection;
