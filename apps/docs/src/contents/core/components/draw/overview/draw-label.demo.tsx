import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Tikz width={360} height={220}>
    <Node id="a" position={[0, 0]} shape="diamond">
      ?
    </Node>
    <Node id="b" position={[160, -60]}>
      yes path
    </Node>
    <Node id="c" position={[160, 60]}>
      no path
    </Node>

    {/* line 段：{ label } 短记法等价 { label: { text: 'yes' } } */}
    <Draw way={['a', { label: 'yes' }, 'b']} arrow="->" />

    {/* line 段：完整 label 对象，side='below' */}
    <Draw way={['a', { label: { text: 'no', side: 'below' } }, 'c']} arrow="->" />

    {/* fold 段：label 算子放在 '-|' 之前 */}
    <Node id="d" position={[40, 120]}>
      d
    </Node>
    <Node id="e" position={[260, 120]}>
      e
    </Node>
    <Draw way={['d', { label: 'fold' }, '-|', 'e']} arrow="->" />
  </Tikz>
);

export default Demo;
