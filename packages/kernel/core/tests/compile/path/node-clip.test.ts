import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe('compile path: 多节点连线段独立 clip（bugfix tikz-from-ir.demo）', () => {
  it('A → B → C → A：B 出口端点不同于 B 入口端点，路径在 B 处可见地断开', () => {
    // A=(0,0)、B=(120,0)、C=(60,60)，无文本默认 16x16
    // 段 A→B：A.right(8,0) → B.left(112,0)
    // 段 B→C：B.center=(120,0) 朝 C.center=(60,60)，方向 (-60,60) 等比例 → 角点 → B.bottom-left=(112,8)；
    //         C.center=(60,60) 朝 B.center，方向 (60,-60) → C.top-right=(68,52)
    // 段 C→A：C 朝 A 方向 (-60,-60) → C.bottom-left=(52,52)；A 朝 C 方向 (60,60) → A.top-right=(8,8)
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [120, 0] },
        { type: 'node', id: 'C', position: [60, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: { id: 'B' } },
            { type: 'step', kind: 'line', to: { id: 'C' } },
            { type: 'step', kind: 'line', to: { id: 'A' } },
          ],
        },
      ],
    };
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 关键：3 个 move（每段独立起点），共 3 个 line
    expect(commands.filter(c => c.kind === 'move')).toHaveLength(3);
    expect(commands.filter(c => c.kind === 'line')).toHaveLength(3);
    // 关键：B 入口（112,0，从 A 那段）≠ B 出口（112,8，朝向 C 的那段）
    expect(commands).toContainEqual(line([112, 0]));
    expect(commands).toContainEqual(move([112, 8]));
  });

  it('直接坐标点 + 折角混合：cursor 复用（无 clip 差异时不起新 sub-path）', () => {
    // 全直接点，每段 fromClip 等于 lastEnd → 复用 cursor，全程一个 sub-path
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [20, 5] },
          ],
        },
      ],
    };
    const commands = findPathPrim(compileToScene(ir).primitives).commands;
    // 期望单 sub-path：move 一次 + line 三次
    expect(commands.filter(c => c.kind === 'move')).toHaveLength(1);
    expect(commands).toEqual([move([0, 0]), line([10, 0]), line([20, 0]), line([20, 5])]);
  });
});
