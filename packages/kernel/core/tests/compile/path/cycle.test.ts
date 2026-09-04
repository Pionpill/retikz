import { describe, expect, it } from 'vitest';

import type { PathPrim } from '../../../src/contract';
import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { arrowMarks } from '../../helpers/arrow-marks';
import { flattenPrims } from '../../helpers/flatten';
import { arc, close, line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'cycle' 闭合", () => {
  it("cycle 段在 d 字符串末尾追加 'Z'", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([10, 10]),
      close(),
    ]);
  });

  it('cycle 不引入新 endpoints，layout 与不带 cycle 的等价路径一致', () => {
    const irWith: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const irWithout: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: [10, 10] },
          ],
        },
      ],
    };
    expect(compileToScene(irWith).scene.layout).toEqual(compileToScene(irWithout).scene.layout);
  });

  it('cycle 与节点 ref 配合：每段独立 clip，cycle 段不能用 Z（闭合点与 lastEnd 不同）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [60, 0] },
        { type: 'node', id: 'C', position: [60, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'line', to: { id: 'B' } },
            { type: 'step', kind: 'line', to: { id: 'C' } },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const commands = findPathPrim(compileToScene(ir).scene.primitives).commands;
    // 三段独立：A→B、B→C、C→A，每段都 M 开头；不出现 close
    expect(commands.some(c => c.kind === 'close')).toBe(false);
    expect(commands.filter(c => c.kind === 'move')).toHaveLength(3);
  });

  it('arc 后显式 move 会切断 arc 留下的 penOverride，新 line 从 move.to 开始', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
            { type: 'step', kind: 'move', to: [20, 20] },
            { type: 'step', kind: 'line', to: [30, 20] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
      move([20, 20]),
      line([30, 20]),
    ]);
  });

  it('arc 后 cycle 从 arc 终点闭合，不回退到上一条 to-bearing step', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [20, 0] },
            { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).scene.primitives).commands).toEqual([
      move([0, 0]),
      line([20, 0]),
      move([30, 0]),
      arc([20, 0], 10, 0, 90),
      line([0, 0]),
    ]);
  });

  it('closing edge label interruption expands close and retains endpoint arrow ownership once', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          stroke: '#13579b',
          marks: arrowMarks('->'),
          label: { text: 'close', position: 0.9, sloped: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
            { type: 'step', kind: 'line', to: [100, 100] },
            { type: 'step', kind: 'cycle' },
          ],
        },
      ],
    };
    const fragments = flattenPrims(
      compileToScene(ir, { measureText: () => ({ width: 20, height: 10 }) }).scene.primitives,
    ).filter((primitive): primitive is PathPrim => primitive.type === 'path' && primitive.stroke === '#13579b');

    expect(fragments.length).toBeGreaterThanOrEqual(2);
    expect(fragments.flatMap(fragment => fragment.commands).some(command => command.kind === 'close')).toBe(false);
    expect(fragments.filter(fragment => fragment.arrowEnd !== undefined)).toHaveLength(1);
    const arrowEndFragment = fragments.find(fragment => fragment.arrowEnd !== undefined);
    const arrowEndCommand = [...(arrowEndFragment?.commands ?? [])].reverse().find(command => command.kind === 'line');

    expect(arrowEndCommand).toMatchObject({ kind: 'line', to: [100, 94.9] });
  });
});
