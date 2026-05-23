import { Node, Scope, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * Scope zIndex：整组在父层的栈序
 * @description 两个 scope 的节点簇重叠。scope 的 zIndex 决定整组（其 GroupPrim）在父层的上下位置，不改组内相对栈序——先声明的 A 组设 zIndex={1}，整组浮到后声明的 B 组之上。
 */
const Demo: FC = () => (
  <TikZ width={300} height={190}>
    {/* A 组：先声明，zIndex=1 → 整组在上 */}
    <Scope transforms={[{ kind: 'translate', x: -22, y: -14 }]} zIndex={1}>
      <Node id="a1" position={[0, 0]} fill="#f87171" stroke="#ef4444" minimumSize={72}>
        A1
      </Node>
      <Node id="a2" position={[38, 0]} fill="#fca5a5" stroke="#ef4444" minimumSize={72}>
        A2
      </Node>
    </Scope>
    {/* B 组：后声明，默认应在上，但被 A 组整体压住 */}
    <Scope transforms={[{ kind: 'translate', x: 22, y: 26 }]}>
      <Node id="b1" position={[0, 0]} fill="#60a5fa" stroke="#3b82f6" minimumSize={72}>
        B1
      </Node>
      <Node id="b2" position={[38, 0]} fill="#93c5fd" stroke="#3b82f6" minimumSize={72}>
        B2
      </Node>
    </Scope>
  </TikZ>
);

export default Demo;
