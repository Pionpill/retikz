import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 路径级 `arrow` prop——透传到底层 PathPrim 的 marker。多节点时（如 a→b→c）
 * 路径会按段独立 clip，箭头**只**贴在整体起点 / 终点，不会出现在中间节点上。
 */
const Demo: FC = () => (
  <Tikz width={360} height={200}>
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
  </Tikz>
);

export default Demo;
