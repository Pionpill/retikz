import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowSmoothKnotsI18n } from './flow-smooth-knots.i18n';

/** 样条几何图语言 */
export type FlowSmoothKnotsProps = Readonly<{ lang?: Lang }>;
/** 同一组 knots 的参考点链与真实样条，展示多障碍绕行 */
const Demo: FC<FlowSmoothKnotsProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowSmoothKnotsI18n[lang];
  const points: Array<[number, number]> = [
    [20, 110],
    [100, 30],
    [220, 90],
    [330, 170],
    [420, 110],
  ];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[220, -15]} text={copy.title} style={{ stroke: 'none', font: { size: 14 } }} />
      <Node
        position={[110, 115]}
        text={copy.a}
        cornerRadius={4}
        layout={{ width: 78, minimumSize: { height: 46 }, padding: 0 }}
        style={{ fill: 'none', font: { size: 14 } }}
      />
      <Node
        position={[330, 75]}
        text={copy.b}
        cornerRadius={4}
        layout={{ width: 78, minimumSize: { height: 46 }, padding: 0 }}
        style={{ fill: 'none', font: { size: 14 } }}
      />
      <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
        <Step kind="move" to={points[0]} />
        {points.slice(1).map((point, index) => (
          <Step key={index} kind="line" to={point} />
        ))}
      </Path>
      <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
        <Step kind="move" to={points[0]} />
        <Step kind="smooth" points={points.slice(1)} />
      </Path>
      {points.map((point, index) => (
        <Node
          key={index}
          position={point}
          shape="circle"
          layout={{ width: 6, minimumSize: { height: 6 }, padding: 0 }}
          style={{ fill: 'dodgerblue', stroke: 'none' }}
        />
      ))}
      {[copy.source, copy.p1, copy.p2, copy.p3, copy.target].map((text, index) => (
        <Node
          key={text}
          position={[points[index][0], points[index][1] + (index === 3 ? 22 : -22)]}
          text={text}
          style={{ stroke: 'none', font: { size: 12 } }}
        />
      ))}
      <Node position={[220, 225]} text={copy.chain} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
      <Node position={[220, 250]} text={copy.check} style={{ stroke: 'none', font: { size: 12 } }} />
    </Layout>
  );
};
export default Demo;
