import { Circle, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={150}>
    {/* 整圆 */}
    <Circle center={[50, 50]} radius={45} stroke="blue" strokeWidth={2} />
    {/* 半圆（带角度 → 默认 chord 弦闭合） */}
    <Circle center={[170, 50]} radius={45} startAngle={0} endAngle={180} fill="lightgray" stroke="red" strokeWidth={2} />
    {/* 纯弧（open） */}
    <Circle center={[290, 50]} radius={45} startAngle={180} endAngle={360} closed="open" stroke="green" strokeWidth={2} />
  </Layout>
);

export default Demo;
