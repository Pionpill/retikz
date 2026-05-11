import { Draw, DrawWay, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * way 末尾 `DrawWay.Cycle` 闭合
 * @description 等价于 <Step kind="cycle" />，对齐 TikZ 写法 `(A) -- (B) -- (C) -- cycle`。
 */
const Demo: FC = () => (
  <Tikz width={320} height={200}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 0]}>
      B
    </Node>
    <Node id="c" position={[80, 120]}>
      C
    </Node>
    <Draw way={['a', 'b', 'c', DrawWay.Cycle]} />
  </Tikz>
);

export default Demo;
