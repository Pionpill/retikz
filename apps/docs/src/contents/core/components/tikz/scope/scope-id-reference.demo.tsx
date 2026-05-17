import { Node, Path, Scope, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * scope.id 基础引用：scope 内 3 节点合成 bbox，外部 path 用 'cluster.<anchor>' 指到 bbox 视觉边界
 * @description external 在最左侧；右侧 `<Scope id="cluster" translate(220, 0)>` 内 3 节点呈三角排列——
 *   外部两条 path 分别引用 `cluster.north`（bbox 顶边中点）与 `cluster.east`（bbox 右边中点），
 *   端点贴 cluster 整体视觉边界而非单个 node。
 */
const Demo: FC = () => (
  <TikZ width={560} height={180}>
    <Node id="external" position={[0, 20]}>external</Node>
    <Scope id="cluster" transforms={[{ kind: 'translate', x: 220, y: 0 }]}>
      <Node id="A" position={[0, 0]}>A</Node>
      <Node id="B" position={[80, 0]}>B</Node>
      <Node id="C" position={[40, 60]}>C</Node>
    </Scope>
    <Path arrow="->">
      <Step kind="move" to="external" />
      <Step to="cluster.north" />
    </Path>
    <Path arrow="->">
      <Step kind="move" to="external" />
      <Step to="cluster.east" />
    </Path>
  </TikZ>
);

export default Demo;
