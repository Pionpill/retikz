import { Circle, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={150}>
    {/* 整圆 */}
    <Circle center={[50, 50]} radius={45} stroke="#3b82f6" strokeWidth={2} />
    {/* 半圆（带角度 → 默认 chord 弦闭合） */}
    <Circle center={[170, 50]} radius={45} startAngle={0} endAngle={180} fill="#eee" stroke="#ef4444" strokeWidth={2} />
    {/* 纯弧（open） */}
    <Circle center={[290, 50]} radius={45} startAngle={180} endAngle={360} closed="open" stroke="#10b981" strokeWidth={2} />
  </TikZ>
);

export default Demo;
