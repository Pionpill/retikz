import { Node, Path, Step, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 起末异形：start.shape='diamond'（UML 组合）、end.shape='normal'（继承箭头）
 * @description 顶层 arrowDetail 留空、start / end 子对象各自只填 shape；compile 把两端解析为 2 个独立 spec、Tikz 容器按 detail hash 注入 2 个 marker defs
 */
const Demo: FC = () => (
  <Tikz width={320} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[260, 0]}>
      B
    </Node>
    <Path
      arrow="<->"
      arrowDetail={{ start: { shape: 'diamond' }, end: { shape: 'normal' } }}
      strokeWidth={2}
    >
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
    </Path>
  </Tikz>
);

export default Demo;
