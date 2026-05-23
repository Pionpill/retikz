import { Rectangle, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={300} height={150}>
    {/* 直角矩形（两对角） */}
    <Rectangle corner1={[10, 20]} corner2={[130, 110]} stroke="#3b82f6" strokeWidth={2} />
    {/* 圆角矩形（中心 + 宽高） */}
    <Rectangle center={[230, 65]} width={120} height={90} roundedCorners={16} fill="#eee" stroke="#ef4444" strokeWidth={2} />
  </TikZ>
);

export default Demo;
