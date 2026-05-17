import { Node, Scope, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 嵌套 scope：外层 translate + 内层 translate 链式累加
 * @description 原点 0 → 外层 scope shift (140, 0) → 内层再 shift (140, 0)，最里层 node `position=[0,0]` 落到 (280, 0)；三层 marker 在同一 baseline 上一字排开，直观展示嵌套 scope.transform 按 IR 顺序逐层叠加。
 */
const Demo: FC = () => (
  <TikZ width={560} height={120}>
    <Node position={[0, 0]} shape="circle" padding={4} stroke="gray">0</Node>
    <Scope transforms={[{ kind: 'translate', x: 140, y: 0 }]}>
      <Node position={[0, 0]} shape="circle" padding={4}>outer</Node>
      <Scope transforms={[{ kind: 'translate', x: 140, y: 0 }]}>
        <Node position={[0, 0]} shape="circle" padding={4}>inner</Node>
      </Scope>
    </Scope>
  </TikZ>
);

export default Demo;
