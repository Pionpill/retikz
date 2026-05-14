import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 半透明箭头：opacity 单独作用于 marker，不影响 path stroke
 * @description path 实色描边、marker 0.5 opacity 视觉对照（区分于 path 整体 opacity）
 */
const Demo: FC = () => (
  <TikZ width={320} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[260, 0]}>
      B
    </Node>
    <Path
      arrow="->"
      arrowDetail={{ shape: 'stealth', opacity: 0.5, color: '#dc2626' }}
      stroke="#1f2937"
      strokeWidth={2}
    >
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
    </Path>
  </TikZ>
);

export default Demo;
