import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={320} height={260}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* bend left 30°（默认 bendAngle）：从 A 看向 B，曲线向视觉左侧（屏幕上方）鼓出 */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="bend" to="b" bendDirection="left" />
    </Path>
    {/* bend right 45°：曲线向视觉右侧（屏幕下方）鼓出，角度更大 */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="bend" to="b" bendDirection="right" bendAngle={45} />
    </Path>
  </TikZ>
);

export default Demo;
