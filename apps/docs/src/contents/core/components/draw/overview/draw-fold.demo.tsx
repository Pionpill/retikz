import { Draw, DrawWay, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 把 `'-|'` / `'|-'` 当 infix 算子直接塞进 way——与 TikZ 写法
 * `(A) -| (B) -- (C) |- (A)` 字面对齐。`DrawWay.hv` 与裸字面量 `'-|'`
 * TS 类型完全等价，按习惯选即可。
 */
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
    <Draw way={['a', DrawWay.hv, 'b', 'c', '|-', 'a']} />
  </Tikz>
);

export default Demo;
