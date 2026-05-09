import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={320} height={260}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* { bend: 'left' }：默认 30°，向视觉左侧（屏幕上方）鼓 */}
    <Draw way={['a', { bend: 'left' }, 'b']} />
    {/* { bend: 'right', angle: 45 }：向视觉右侧（屏幕下方）鼓，更大 */}
    <Draw way={['a', { bend: 'right', angle: 45 }, 'b']} />
  </Tikz>
);

export default Demo;
