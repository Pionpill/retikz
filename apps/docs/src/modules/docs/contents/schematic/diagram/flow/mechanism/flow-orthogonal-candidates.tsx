import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowOrthogonalCandidatesI18n } from './flow-orthogonal-candidates.i18n';

/** 正交候选图语言 */
export type FlowOrthogonalCandidatesProps = Readonly<{ lang?: Lang }>;
/** 固定端点与障碍，对照三条未圆角化的参考折线 */
const Demo: FC<FlowOrthogonalCandidatesProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowOrthogonalCandidatesI18n[lang];
  return (
    <Layout viewBox={{ x: -12, y: -8, width: 520, height: 306 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {[
        { x: 240, color: 'red' },
        { x: 325, color: 'gray' },
        { x: 155, color: 'dodgerblue' },
      ].map(candidate => (
        <Path
          key={candidate.x}
          style={{
            stroke: candidate.color,
            strokeWidth: candidate.x === 155 ? 2 : 1,
            ...(candidate.x === 155 ? {} : { dashPattern: [5, 4] }),
          }}
        >
          <Step kind="move" to={[70, 70]} />
          <Step kind="line" to={[candidate.x, 70]} />
          <Step kind="line" to={[candidate.x, 190]} />
          <Step kind="line" to={[410, 190]} />
        </Path>
      ))}
      {[
        { x: 40, y: 70, text: copy.source },
        { x: 440, y: 190, text: copy.target },
        { x: 240, y: 130, text: copy.obstacle },
      ].map(node => (
        <Node
          key={node.text}
          position={[node.x, node.y]}
          text={node.text}
          shape="rectangle"
          cornerRadius={4}
          layout={{ width: node.x === 240 ? 76 : 60, minimumSize: { height: 36 }, padding: 0 }}
          style={{ fill: 'none', font: { size: 14 } }}
        />
      ))}
      <Node
        position={[130, 35]}
        text={copy.quarter}
        style={{ stroke: 'none', textColor: 'dodgerblue', font: { size: 12 } }}
      />
      <Node position={[240, 15]} text={copy.middle} style={{ stroke: 'none', textColor: 'red', font: { size: 12 } }} />
      <Node
        position={[350, 35]}
        text={copy.threeQuarter}
        style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
      <Node position={[248, 240]} text={copy.comparison} style={{ stroke: 'none', font: { size: 12 } }} />
      <Node position={[248, 266]} text={copy.result} style={{ stroke: 'none', font: { size: 12 } }} />
    </Layout>
  );
};
export default Demo;
