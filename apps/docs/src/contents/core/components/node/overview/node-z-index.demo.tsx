import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * zIndex 显式栈序
 * @description 声明顺序 a → b → c，默认最后声明的 c 压在最上；给最先声明的 a 设 zIndex={2}，把它浮到所有同层节点之上，而不必把它挪到 JSX 末尾。
 */
const Demo: FC = () => (
  <TikZ width={260} height={170}>
    {/* 先声明，但 zIndex=2 → 浮到最上层 */}
    <Node id="a" position={[-26, -18]} fill="#f87171" stroke="#ef4444" minimumSize={90} zIndex={2}>
      z=2
    </Node>
    {/* 默认 z=0，按声明顺序在 c 之下 */}
    <Node id="b" position={[0, 0]} fill="#60a5fa" stroke="#3b82f6" minimumSize={90}>
      z=0
    </Node>
    {/* 默认 z=0，按声明顺序压在 b 上、但仍在 a 之下 */}
    <Node id="c" position={[26, 18]} fill="#34d399" stroke="#10b981" minimumSize={90}>
      z=0
    </Node>
  </TikZ>
);

export default Demo;
