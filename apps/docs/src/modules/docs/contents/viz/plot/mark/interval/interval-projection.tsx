import { SectorShapeDefinition } from '@retikz/extension';
import { pointAtArcAngle } from '@retikz/math';
import type { Position } from '@retikz/math';
import { Layout, Node, Path, Step } from '@retikz/react';
import { Fragment } from 'react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { intervalProjectionI18n } from './interval-projection.i18n';

/** 区间投影示意图语言 */
export type IntervalProjectionProps = { lang?: Lang };

/** 几何示意中的文字，位置独立于被解释的区域 */
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

/** 构造辅助线；点线不属于最终图元 */
const guide = (points: Array<Position>) => (
  <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
    <Step kind="move" to={points[0]} />
    {points.slice(1).map((to, index) => (
      <Step key={index} to={to} />
    ))}
  </Path>
);

/** 同一区间在局部法向、区域边界和最终绘制三个阶段的几何快照 */
const IntervalProjection: FC<IntervalProjectionProps> = props => {
  const { lang = 'zh' } = props;
  const text = intervalProjectionI18n[lang];
  return (
    <Layout
      viewBox={{ x: 0, y: 0, width: 750, height: 430 }}
      extensions={{ shapes: [SectorShapeDefinition] }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {[0, 1, 2].map(stage => {
        const left = 30 + stage * 250;
        const center: Position = [left + 35, 365];
        return (
          <Fragment key={stage}>
            {caption(text.stages[stage], [stage * 250 + 125, 20])}
            {caption(text.cartesian, [stage * 250 + 125, 50], true)}
            <Path>
              <Step kind="move" to={[left + 20, 75]} />
              <Step to={[left + 20, 200]} />
              <Step to={[left + 185, 200]} />
            </Path>
            {caption('x', [left + 195, 200], true)}
            {caption('y', [left + 20, 65], true)}
            {[65, 140].map((x, index) => (
              <Fragment key={x}>
                {caption(index === 0 ? 'x₀' : 'x₁', [left + x, 214], true)}
                <Path
                  style={{ stroke: stage === 0 ? 'darkorange' : 'currentColor' }}
                  arrow={stage === 0 ? { end: {} } : undefined}
                >
                  <Step kind="move" to={[left + x, 200]} />
                  <Step to={[left + x, stage === 0 ? 173 : 196]} />
                </Path>
              </Fragment>
            ))}
            {[110, 170].map((y, index) => (
              <Fragment key={y}>
                {caption(index === 0 ? 'y₁' : 'y₀', [left + 5, y], true)}
                <Path
                  style={{ stroke: stage === 0 ? 'dodgerblue' : 'currentColor' }}
                  arrow={stage === 0 ? { end: {} } : undefined}
                >
                  <Step kind="move" to={[left + 20, y]} />
                  <Step to={[left + (stage === 0 ? 47 : 24), y]} />
                </Path>
              </Fragment>
            ))}
            {stage > 0 && (
              <>
                <Node
                  position={[left + 102.5, 140]}
                  shape="rectangle"
                  layout={{ minimumSize: { width: 75, height: 60 }, padding: 0 }}
                  cornerRadius={stage === 2 ? 10 : 0}
                  style={{
                    fill: 'dodgerblue',
                    opacity: { fill: stage === 2 ? 0.3 : 0.12 },
                    stroke: stage === 2 ? 'dodgerblue' : 'none',
                    strokeWidth: 2,
                  }}
                />
                {[65, 140].map(x => (
                  <Fragment key={x}>
                    {guide([
                      [left + x, 200],
                      [left + x, 85],
                    ])}
                  </Fragment>
                ))}
                {[110, 170].map(y => (
                  <Fragment key={y}>
                    {guide([
                      [left + 20, y],
                      [left + 175, y],
                    ])}
                  </Fragment>
                ))}
              </>
            )}
            {caption(text.polar, [stage * 250 + 125, 236], true)}
            <Path>
              <Step kind="move" to={center} />
              <Step to={[center[0] + 125, center[1]]} />
              <Step kind="move" to={pointAtArcAngle(center, 110, -90)} />
              <Step kind="arc" center={center} startAngle={-90} endAngle={0} radius={110} />
            </Path>
            {caption('r', [center[0] + 137, center[1]], true)}
            {caption('θ', [center[0] - 12, center[1] - 110], true)}
            {[-65, -20].map((angle, index) => (
              <Fragment key={angle}>
                {caption(index === 0 ? 'θ₀' : 'θ₁', pointAtArcAngle(center, 125, angle), true)}
                <Path
                  style={{ stroke: stage === 0 ? 'darkorange' : 'currentColor' }}
                  arrow={stage === 0 ? { end: {} } : undefined}
                >
                  <Step kind="move" to={pointAtArcAngle(center, 110, angle)} />
                  <Step to={pointAtArcAngle(center, stage === 0 ? 85 : 106, angle)} />
                </Path>
              </Fragment>
            ))}
            {[45, 92].map((radius, index) => (
              <Fragment key={radius}>
                {caption(index === 0 ? 'r₀' : 'r₁', [center[0] + radius, center[1] + 15], true)}
                <Path
                  style={{ stroke: stage === 0 ? 'dodgerblue' : 'currentColor' }}
                  arrow={stage === 0 ? { end: {} } : undefined}
                >
                  <Step kind="move" to={[center[0] + radius, center[1]]} />
                  <Step to={[center[0] + radius, center[1] - (stage === 0 ? 25 : 4)]} />
                </Path>
              </Fragment>
            ))}
            {stage > 0 && (
              <>
                <Node
                  position={center}
                  shape={{
                    type: 'sector',
                    params: {
                      innerRadius: 45,
                      outerRadius: 92,
                      startAngle: -65,
                      endAngle: -20,
                      cornerRadius: stage === 2 ? 8 : 0,
                    },
                  }}
                  style={{
                    fill: 'dodgerblue',
                    opacity: { fill: stage === 2 ? 0.3 : 0.12 },
                    stroke: stage === 2 ? 'dodgerblue' : 'none',
                    strokeWidth: 2,
                  }}
                />
                {[45, 92].map(radius => (
                  <Path key={radius} style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
                    <Step kind="move" to={pointAtArcAngle(center, radius, -90)} />
                    <Step kind="arc" center={center} startAngle={-90} endAngle={0} radius={radius} />
                  </Path>
                ))}
                {[-65, -20].map(angle => (
                  <Fragment key={angle}>{guide([center, pointAtArcAngle(center, 110, angle)])}</Fragment>
                ))}
              </>
            )}
            {caption(text.notes[stage], [stage * 250 + 125, 412], true)}
          </Fragment>
        );
      })}
    </Layout>
  );
};

export default IntervalProjection;
