import { Arc, Layout } from '@retikz/react';
import type { FC } from 'react';

/**
 * Arc 透传整套 Path 视觉属性：arrow（箭头弧）/ dashPattern（虚线弧）/ marks（中段方向标记）。
 */
const Demo: FC = () => (
  <Layout width={360} height={130}>
    {/* 箭头弧：arrow 让开放弧带箭头，常用于角度标记 / 曲线箭头 */}
    <Arc center={[60, 25]} radius={55} startAngle={20} endAngle={160} strokeWidth={2} arrow="->" />
    {/* 虚线弧 */}
    <Arc center={[180, 25]} radius={55} startAngle={20} endAngle={160} strokeWidth={2} dashPattern={[5, 3]} />
    {/* 中段 marks：沿弧放方向箭头，朝向随切线 */}
    <Arc
      center={[300, 25]}
      radius={55}
      startAngle={20}
      endAngle={160}
      strokeWidth={2}
      marks={[{ pos: 0.5, mark: { kind: 'arrow', shape: 'stealth' } }]}
    />
  </Layout>
);

export default Demo;
