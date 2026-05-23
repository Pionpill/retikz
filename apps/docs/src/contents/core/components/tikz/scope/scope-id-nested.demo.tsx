import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 嵌套 scope.id：outer.bbox 包内层 inner 全部 node，inner.bbox 仅含 inner 子集
 * @description outer 在 translate(80, 0) 内放节点 A + 嵌套 inner（再 translate(140, 0)）；
 *   inner 内含 B / C 两个节点。一条外部 path 引用 `outer.south`（包 A、B、C 的 south 边），
 *   另一条引用 `inner.south`（仅 B、C 的 south 边）——两 bbox 独立存在，外层包内层。
 */
const Demo: FC = () => (
  <Layout width={560} height={180}>
    <Scope id="outer" transforms={[{ kind: 'translate', x: 80, y: 30 }]}>
      <Node id="A" position={[0, 0]}>A</Node>
      <Scope id="inner" transforms={[{ kind: 'translate', x: 140, y: 0 }]}>
        <Node id="B" position={[0, 0]}>B</Node>
        <Node id="C" position={[80, 0]}>C</Node>
      </Scope>
    </Scope>
    <Path arrow="->">
      <Step kind="move" to={[0, 160]} />
      <Step to="outer.south" />
    </Path>
    <Path arrow="->">
      <Step kind="move" to={[540, 160]} />
      <Step to="inner.south" />
    </Path>
  </Layout>
);

export default Demo;
