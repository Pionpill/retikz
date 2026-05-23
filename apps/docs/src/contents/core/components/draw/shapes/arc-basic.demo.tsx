import { Arc, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={150}>
    {/* 圆弧 0→90（东→南，y-down） */}
    <Arc center={[60, 30]} radius={70} startAngle={0} endAngle={90} stroke="#3b82f6" strokeWidth={2} />
    {/* 椭圆弧 */}
    <Arc center={[200, 30]} radiusX={80} radiusY={50} startAngle={0} endAngle={120} stroke="#ef4444" strokeWidth={2} />
  </TikZ>
);

export default Demo;
