import { Node, Scope, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * resetStyle 继承屏障：切外层 scope 继承轴
 * @description 外层 scope color=红，左节点跟红；内层 scope resetStyle 后回内置基线，
 *   右节点恢复默认黑——本层自己的值仍生效、只切外层累积。
 */
const Demo: FC = () => (
  <TikZ width={420} height={130}>
    <Scope color="#dc2626">
      <Node id="A" position={[0, 0]} shape="circle" fill="white">
        A
      </Node>
      <Scope resetStyle transforms={[{ kind: 'translate', x: 180, y: 0 }]}>
        <Node id="B" position={[0, 0]} shape="circle">
          B
        </Node>
      </Scope>
    </Scope>
  </TikZ>
);

export default Demo;
