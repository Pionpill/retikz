import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowBendCandidatesI18n } from './flow-bend-candidates.i18n';

/** 候选参考曲线示意图的语言 */
export type FlowBendCandidatesProps = Readonly<{ lang?: Lang }>;

/** 同一端点下展示节点筛选、标签决胜与小角度偏好 */
const FlowBendCandidates: FC<FlowBendCandidatesProps> = props => {
  const { lang = 'zh' } = props;
  const t = flowBendCandidatesI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[30, 45, 60].flatMap(bendAngle =>
        (['left', 'right'] as const).map(bendDirection => {
          const selected = bendAngle === 45 && bendDirection === 'right';
          return (
            <Path
              key={`${bendDirection}-${bendAngle}`}
              style={
                selected
                  ? { stroke: 'dodgerblue', strokeWidth: 2 }
                  : { stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }
              }
              label={{
                text: `${bendDirection === 'left' ? t.left : t.right} ${bendAngle}°`,
                position: 0.28,
                side: bendDirection === 'left' ? 'top' : 'bottom',
                distance: 3,
                textColor: selected ? 'dodgerblue' : 'gray',
                font: { size: 12 },
              }}
            >
              <Step kind="move" to={[10, 140]} />
              <Step kind="bend" to={[370, 140]} bendDirection={bendDirection} bendAngle={bendAngle} />
            </Path>
          );
        }),
      )}
      <Node
        position={[190, 140]}
        text={t.node}
        cornerRadius={4}
        layout={{ width: 52, minimumSize: { height: 100 }, padding: 0 }}
        style={{ fill: 'none', font: { size: 14 } }}
      />
      <Node
        position={[190, 66]}
        text={t.label}
        cornerRadius={4}
        layout={{ width: 88, minimumSize: { height: 24 }, padding: 0 }}
        style={{ fill: 'none', stroke: 'darkorange', textColor: 'currentColor', font: { size: 12 } }}
      />
      <Node
        position={[10, 140]}
        shape="circle"
        layout={{ width: 6, minimumSize: { height: 6 }, padding: 0 }}
        style={{ fill: 'currentColor' }}
      />
      <Node
        position={[370, 140]}
        shape="circle"
        layout={{ width: 6, minimumSize: { height: 6 }, padding: 0 }}
        style={{ fill: 'currentColor' }}
      />
      <Node position={[10, 170]} text={t.source} style={{ stroke: 'none', font: { size: 12 } }} />
      <Node position={[370, 170]} text={t.target} style={{ stroke: 'none', font: { size: 12 } }} />
      {[
        [t.nodes, t.nodeResult],
        [t.labels, t.labelResult],
        [t.preference, t.result],
      ].map(([title, detail], index) => (
        <Node
          key={title}
          position={[525, 65 + index * 70]}
          text={[title, { text: detail, font: { size: 12 }, fill: 'gray' }]}
          style={{ stroke: 'none', font: { size: 14 } }}
        />
      ))}
      <Node position={[320, 285]} text={t.legend} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
    </Layout>
  );
};

export default FlowBendCandidates;
