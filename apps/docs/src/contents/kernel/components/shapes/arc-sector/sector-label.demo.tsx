import { Layout, Node, Sector } from '@retikz/react';
import type { FC } from 'react';

/**
 * 实心扇形圆心可接节点 id（center="hub"）；startAngle + sweepAngle 给扇区；label 沿弧标注。
 * 三段拼成一张带标签的饼图。
 */
const Demo: FC = () => (
  <Layout width={300} height={220}>
    {/* 圆心放在节点上：实心扇形圆心 = 游标，center 接任意 Target */}
    <Node id="hub" position={[150, 110]} stroke="none" />
    {/* sweepAngle：起角 + 扫掠角（startAngle / endAngle / sweepAngle 三选二） */}
    <Sector
      center="hub"
      radius={95}
      startAngle={-90}
      sweepAngle={130}
      fill="darkorange"
      stroke="white"
      strokeWidth={1.5}
      label={{ text: '36%', textColor: 'white' }}
    />
    <Sector
      center="hub"
      radius={95}
      startAngle={40}
      sweepAngle={140}
      fill="dodgerblue"
      stroke="white"
      strokeWidth={1.5}
      label={{ text: '39%', textColor: 'white' }}
    />
    <Sector
      center="hub"
      radius={95}
      startAngle={180}
      sweepAngle={90}
      fill="darkviolet"
      stroke="white"
      strokeWidth={1.5}
      label={{ text: '25%', textColor: 'white' }}
    />
  </Layout>
);

export default Demo;
