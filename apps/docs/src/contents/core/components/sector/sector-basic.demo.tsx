import { Sector, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={170}>
    {/* 三个扇形拼成的饼图片段 */}
    <Sector center={[90, 90]} radius={75} startAngle={0} endAngle={120} fill="#3b82f6" stroke="#fff" strokeWidth={2} />
    <Sector center={[90, 90]} radius={75} startAngle={120} endAngle={210} fill="#ef4444" stroke="#fff" strokeWidth={2} />
    <Sector center={[90, 90]} radius={75} startAngle={210} endAngle={360} fill="#10b981" stroke="#fff" strokeWidth={2} />
  </TikZ>
);

export default Demo;
