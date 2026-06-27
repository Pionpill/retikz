import { Draw, DrawWay, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * `'-|'` / `'|-'` 当 infix 折角算子
 * @description 与 TikZ `(A) -| (B) -- (C) |- (-40, 60)` 字面对齐；折角终点既能是节点 id 也能是坐标，`DrawWay.Hv` 与字面量 `'-|'` TS 等价。
 */
const Demo: FC = () => (
  <Layout width={360} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 80]}>
      B
    </Node>
    <Node id="c" position={[80, -60]}>
      C
    </Node>
    <Draw way={['a', DrawWay.Hv, 'b', 'c', '|-', [-40, 60]]} />
  </Layout>
);

export default Demo;
