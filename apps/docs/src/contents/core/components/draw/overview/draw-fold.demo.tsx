import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={360} height={200}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 80]}>
      B
    </Node>
    <Node id="c" position={[80, -60]}>
      C
    </Node>
    {/* way 里直接传折角对象 { via, to }；与 <Path><Step kind="step" /> 等价。 */}
    <Draw way={['a', { via: '-|', to: 'b' }, 'c', { via: '|-', to: 'a' }]} />
  </Tikz>
);

export default Demo;
