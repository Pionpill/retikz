import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';
import { Fragment } from 'react';

import type { Lang } from '@/i18n';

import { flowBezierObstaclesI18n } from './flow-bezier-obstacles.i18n';

/** 多节点几何对照图语言 */
export type FlowBezierObstaclesProps = Readonly<{ lang?: Lang }>;

/** 固定同一组障碍，对比基线、两侧候选与选择结果；仅展示 τ=1/2 的代表候选 */
const Demo: FC<FlowBezierObstaclesProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowBezierObstaclesI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[0, 1, 2].map(stage => {
        const y = stage * 176;
        return (
          <Fragment key={stage}>
            <Node position={[240, y]} text={copy.titles[stage]} style={{ stroke: 'none', font: { size: 14 } }} />
            {stage === 1 && (
              <Node
                position={[240, y + 85]}
                layout={{ width: 160, minimumSize: { height: 24 }, padding: 0 }}
                style={{ fill: 'none', stroke: 'gray', dashPattern: [1, 4] }}
              />
            )}
            <Path style={{ stroke: stage === 0 ? 'red' : 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
              <Step kind="move" to={[40, y + 85]} />
              <Step kind="line" to={[440, y + 85]} />
            </Path>
            {stage === 1 && (
              <Path style={{ stroke: 'red', strokeWidth: 2 }}>
                <Step kind="move" to={[40, y + 85]} />
                <Step kind="curve" to={[440, y + 85]} control={[240, y + 13]} />
              </Path>
            )}
            {stage > 0 && (
              <Path style={{ stroke: stage === 2 ? 'green' : 'dodgerblue', strokeWidth: 2 }}>
                <Step kind="move" to={[40, y + 85]} />
                <Step kind="curve" to={[440, y + 85]} control={[240, y + 157]} />
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
            {stage === 1 && (
              <>
                <Node
                  position={[240, y + 121]}
                  shape="circle"
                  layout={{ width: 5, minimumSize: { height: 5 }, padding: 0 }}
                  style={{ fill: 'dodgerblue', stroke: 'none' }}
                />
                <Node
                  position={[258, y + 127]}
                  text={copy.through}
                  style={{ stroke: 'none', textColor: 'dodgerblue', font: { size: 12 } }}
                />
              </>
            )}
            <Node
              position={[240, y + 150]}
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
