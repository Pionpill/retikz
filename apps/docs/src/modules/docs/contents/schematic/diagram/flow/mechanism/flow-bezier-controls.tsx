import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { flowBezierControlsI18n } from './flow-bezier-controls.i18n';

/** 经过点与控制点示意语言 */
export type FlowBezierControlsProps = Readonly<{ lang?: Lang }>;

/** 固定 τ 下反求控制点，曲线经过目标而不经过控制点 */
const Demo: FC<FlowBezierControlsProps> = props => {
  const { lang = 'zh' } = props;
  const copy = flowBezierControlsI18n[lang];

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
        <Step kind="move" to={[20, 160]} />
        <Step kind="line" to={[180, -80]} />
        <Step kind="line" to={[340, 160]} />
      </Path>
      <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
        <Step kind="move" to={[20, 160]} />
        <Step kind="curve" to={[340, 160]} control={[180, -80]} />
      </Path>
      <Node
        position={[180, 140]}
        text={copy.obstacle}
        layout={{ width: 90, minimumSize: { height: 55 }, padding: 0 }}
        cornerRadius={4}
        style={{ fill: 'none', font: { size: 14 } }}
      />
      {(
        [
          [20, 160],
          [340, 160],
          [180, -80],
          [180, 40],
        ] as const
      ).map(([x, y], index) => (
        <Node
          key={index}
          position={[x, y]}
          shape="circle"
          layout={{ width: 6, minimumSize: { height: 6 }, padding: 0 }}
          style={{ fill: index === 2 ? 'darkorange' : 'dodgerblue', stroke: 'none' }}
        />
      ))}
      <Node position={[20, 190]} text={copy.source} style={{ stroke: 'none', font: { size: 12 } }} />
      <Node position={[340, 190]} text={copy.target} style={{ stroke: 'none', font: { size: 12 } }} />
      <Node
        position={[180, -105]}
        text={copy.control}
        style={{ stroke: 'none', textColor: 'darkorange', font: { size: 14 } }}
      />
      <Node
        position={[180, 15]}
        text={copy.through}
        style={{ stroke: 'none', textColor: 'dodgerblue', font: { size: 14 } }}
      />
      <Node position={[180, 230]} text={copy.note} style={{ stroke: 'none', font: { size: 14 } }} />
      <Node
        position={[180, 258]}
        text={copy.legend}
        style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default Demo;
