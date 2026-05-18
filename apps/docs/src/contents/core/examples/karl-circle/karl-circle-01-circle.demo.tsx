import type { FC } from 'react';
import { Path, Step, TikZ } from '@retikz/react';

const Demo: FC = () => (
  <TikZ width={600} height={360}>
    {/* 单位圆：先 move 到原点（圆心），再 circlePath 一次成型；半径 100px */}
    <Path lineCap="round">
      <Step kind="move" to={[0, 0]} />
      <Step kind="circlePath" radius={100} />
    </Path>
  </TikZ>
);

export default Demo;
