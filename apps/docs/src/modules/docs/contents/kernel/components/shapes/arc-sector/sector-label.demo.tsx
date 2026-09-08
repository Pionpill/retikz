import type { FC } from 'react';

import { Layout, Node, Sector } from '@retikz/react';

/**
 * 实心扇形圆心可接节点 id（center="hub"）；startAngle + sweepAngle 给扇区；label 沿弧标注。
 * 三段拼成一张带标签的饼图。
 */
const Demo: FC = () => (
  <Layout>
    {/* 圆心放在节点上：实心扇形圆心 = 游标，center 接任意 Target */}
    <Node id="hub" position={[150, 110]} style={{ stroke: 'none' }} />
    {/* sweepAngle：起角 + 扫掠角（startAngle / endAngle / sweepAngle 三选二） */}
    <Sector
      center="hub"
      radius={95}
      startAngle={-90}
      sweepAngle={130}
      label={{ text: '36%', textColor: 'white' }}
      style={{ fill: 'darkorange', stroke: 'white', strokeWidth: 1.5 }}
    />
    <Sector
      center="hub"
      radius={95}
      startAngle={40}
      sweepAngle={140}
      label={{ text: '39%', textColor: 'white' }}
      style={{ fill: 'dodgerblue', stroke: 'white', strokeWidth: 1.5 }}
    />
    <Sector
      center="hub"
      radius={95}
      startAngle={180}
      sweepAngle={90}
      label={{ text: '25%', textColor: 'white' }}
      style={{ fill: 'darkviolet', stroke: 'white', strokeWidth: 1.5 }}
    />
  </Layout>
);

export default Demo;
