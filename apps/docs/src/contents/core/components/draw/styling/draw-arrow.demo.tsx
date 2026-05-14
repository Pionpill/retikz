import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 路径级 `arrow` prop
 * @description 透传到底层 PathPrim 的 marker；多节点路径按段独立 clip，箭头只贴整体起点 / 终点，不出现在中间节点。
 */
const Demo: FC = () => (
  <TikZ width={360} height={200}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 0]}>
      B
    </Node>
    <Node id="c" position={[80, 100]}>
      C
    </Node>
    {/* 单段：A → B 终点箭头 */}
    <Draw way={['a', 'b']} arrow="->" />
    {/* 多段：A → C → B 整体只在 B 处放终点箭头（中间节点 C 不放） */}
    <Draw way={['a', 'c', 'b']} arrow="->" stroke="#3b82f6" strokeWidth={2} />
  </TikZ>
);

export default Demo;
