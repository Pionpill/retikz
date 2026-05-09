import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={320} height={160}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* 二次贝塞尔：infix 算子 { curve: [cx, cy] } 坐落两个 target 之间 */}
    <Draw way={['a', { curve: [100, -60] }, 'b']} />
  </Tikz>
);

export default Demo;
