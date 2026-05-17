import { Node, Path, Scope, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * localNamespace 基础隔离：外层 id="A" 与 scope 内 id="A" 各自独立
 * @description 左侧外层 A 在原点；右侧 `<Scope localNamespace>` 在 translate(280, 0) 后内部也有 id="A"，但属于子 frame。外层 path 引用 'A' 命中外层 A；scope 内 path 引用 'A' inside-out 命中本 frame 内的 A——两条 path 端点各自指向不同节点，演示命名空间隔离。
 */
const Demo: FC = () => (
  <TikZ width={560} height={140}>
    <Node id="A" position={[0, 0]}>outer A</Node>
    <Scope localNamespace transforms={[{ kind: 'translate', x: 280, y: 0 }]}>
      <Node id="A" position={[0, 0]}>inner A</Node>
      <Path arrow="->">
        <Step kind="move" to={[0, 50]} />
        <Step to="A" />
      </Path>
    </Scope>
    <Path arrow="->">
      <Step kind="move" to={[0, -50]} />
      <Step to="A" />
    </Path>
  </TikZ>
);

export default Demo;
