import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={280} height={200}>
    <Node id="center" position={[100, 100]} stroke="none">
      ·
    </Node>
    {/* 0°→90° 弧（retikz polar 约定下：从 +x 顺时针走到 +y 视觉下方） */}
    <Path stroke="currentColor">
      <Step kind="move" to="center" />
      <Step kind="arc" startAngle={0} endAngle={90} radius={60} />
    </Path>
    {/* 270°→360° 弧（视觉左上半弧） */}
    <Path stroke="currentColor" dashPattern="4 2">
      <Step kind="move" to="center" />
      <Step kind="arc" startAngle={270} endAngle={360} radius={60} />
    </Path>
  </TikZ>
);

export default Demo;
