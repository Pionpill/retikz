import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';
import { Fragment } from 'react';

import type { Lang } from '@/i18n';

import { flowCubicAvoidanceI18n } from './flow-cubic-avoidance.i18n';

/** 三次避让示意语言 */
export type FlowCubicAvoidanceProps = Readonly<{ lang?: Lang }>;

/** 对称目标 τ=1/2 时，两控制点横向互补，纵向偏移为 Q 偏移的 4/3 */
const Demo: FC<FlowCubicAvoidanceProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowCubicAvoidanceI18n[lang];
  const armY = (36 * 4) / 3;
  const armX = armY / Math.tan(Math.PI / 6);
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[0, 1].map(stage => {
        const y = stage * 200;
        return (
          <Fragment key={stage}>
            <Node position={[240, y]} text={copy.titles[stage]} style={{ stroke: 'none', font: { size: 14 } }} />
            <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
              <Step kind="move" to={[40, y + 85]} />
              <Step kind="line" to={[440, y + 85]} />
            </Path>
            {stage === 0 && (
              <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
                <Step kind="move" to={[40, y + 85]} />
                <Step kind="line" to={[40 + armX, y + 85 + armY]} />
                <Step kind="line" to={[440 - armX, y + 85 + armY]} />
                <Step kind="line" to={[440, y + 85]} />
              </Path>
            )}
            {(stage === 0 ? [30] : [30, 60]).map(angle => {
              const x = armY / Math.tan((angle * Math.PI) / 180);
              return (
                <Path key={angle} style={{ stroke: angle === 30 ? 'dodgerblue' : 'darkorange', strokeWidth: 2 }}>
                  <Step kind="move" to={[40, y + 85]} />
                  <Step
                    kind="cubic"
                    to={[440, y + 85]}
                    control1={[40 + x, y + 85 + armY]}
                    control2={[440 - x, y + 85 + armY]}
                  />
                </Path>
              );
            })}
            {stage === 1 && (
              <Path style={{ stroke: 'red', strokeWidth: 2 }}>
                <Step kind="move" to={[40, y + 85]} />
                <Step
                  kind="cubic"
                  to={[440, y + 85]}
                  control1={[40 + armX, y + 85 - armY]}
                  control2={[440 - armX, y + 85 - armY]}
                />
              </Path>
            )}
            {[
              [180, 85],
              [300, 85],
              [240, 49],
            ].map(([x, offset], index) => (
              <Node
                key={index}
                position={[x, y + offset]}
                text={copy.nodes[index]}
                layout={{ width: 40, minimumSize: { height: 24 }, padding: 0 }}
                cornerRadius={4}
                style={{ fill: 'none', font: { size: 14 } }}
              />
            ))}
            {[40, 440].map((x, index) => (
              <Node
                key={x}
                position={[x, y + 85]}
                text={index === 0 ? copy.source : copy.target}
                layout={{ padding: 5 }}
                cornerRadius={4}
                style={{ font: { size: 12 } }}
              />
            ))}
            {stage === 0 &&
              [40 + armX, 440 - armX].map((x, index) => (
                <Fragment key={x}>
                  <Node
                    position={[x, y + 85 + armY]}
                    shape="circle"
                    layout={{ width: 5, minimumSize: { height: 5 }, padding: 0 }}
                    style={{ fill: 'darkorange', stroke: 'none' }}
                  />
                  <Node
                    position={[x, y + 151]}
                    text={copy.controls[index]}
                    style={{ stroke: 'none', textColor: 'darkorange', font: { size: 12 } }}
                  />
                </Fragment>
              ))}
            <Node
              position={[240, y + 121]}
              shape="circle"
              layout={{ width: 5, minimumSize: { height: 5 }, padding: 0 }}
              style={{ fill: 'dodgerblue', stroke: 'none' }}
            />
            <Node
              position={[240, y + 144]}
              text={copy.through}
              style={{ stroke: 'none', textColor: 'dodgerblue', font: { size: 12 } }}
            />
            <Node
              position={[240, y + 177]}
              text={copy.notes[stage]}
              style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
            />
          </Fragment>
        );
      })}
    </Layout>
  );
};
export default Demo;
