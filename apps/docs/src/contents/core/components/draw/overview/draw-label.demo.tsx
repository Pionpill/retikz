import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={520} height={220}>
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
    <Node id="d" position={[270, -45]}>
      d
    </Node>
    <Node id="e" position={[470, -45]}>
      e
    </Node>
    <Draw way={['d', { label: 'fold' }, '-|', 'e']} arrow="->" />

    {/* sloped：side='sloped' 让标签沿段切线方向旋转贴线 */}
    <Node id="f" position={[270, 65]}>
      f
    </Node>
    <Node id="g" position={[470, 35]}>
      g
    </Node>
    <Draw
      way={['f', { label: { text: 'distance = 12', side: 'sloped' } }, 'g']}
      arrow="->"
    />
  </TikZ>
);

export default Demo;
