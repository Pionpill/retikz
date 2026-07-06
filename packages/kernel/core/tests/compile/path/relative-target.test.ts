import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { arc, ellipseArc, line, move, quad } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'relative' / 'relativeAccumulate'", () => {
  it('relative 解析为 prevEnd + offset；prevEnd 不更新（链式 relative 全相对同一锚点）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: { relative: [5, 0] } },
            { type: 'step', kind: 'line', to: { relative: [3, 0] } },
          ],
        },
      ],
    };
    // (10,0) prevEnd 锚定；两条 rel 都从 (10,0) 出发
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([15, 0]),
      line([13, 0]),
    ]);
  });

  it('relativeAccumulate 解析为 prevEnd + offset；更新 prevEnd（链式累积）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
            { type: 'step', kind: 'line', to: { relativeAccumulate: [5, 0] } },
            { type: 'step', kind: 'line', to: { relativeAccumulate: [3, 0] } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([15, 0]),
      line([18, 0]),
    ]);
  });

  it('relative + relativeAccumulate 混用', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { relative: [10, 0] } }, // → (10,0)，prevEnd 留 (0,0)
            { type: 'step', kind: 'line', to: { relativeAccumulate: [5, 5] } }, // → (5,5)，prevEnd → (5,5)
            { type: 'step', kind: 'line', to: { relative: [-3, 0] } }, // → (2,5)，prevEnd 留 (5,5)
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([5, 5]),
      line([2, 5]),
    ]);
  });

  it('relative 与曲线 step 混用（curve 后 prevEnd 是曲线终点）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'curve',
              to: [10, 0],
              control: [5, -5],
            },
            { type: 'step', kind: 'line', to: { relative: [5, 0] } },
          ],
        },
      ],
    };
    // 曲线后 prevEnd = (10,0)；rel 解析到 (15,0)
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([0, 0]),
      quad([5, -5], [10, 0]),
      line([15, 0]),
    ]);
  });

  it('relative 在 arc 之后：以 arc 终点为锚点', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            {
              type: 'step',
              kind: 'arc',
              startAngle: 0,
              endAngle: 90,
              radius: 10,
            },
            { type: 'step', kind: 'line', to: { relative: [5, 0] } },
          ],
        },
      ],
    };
    // arc endpoint (polar y-down) = (0, 10)；relative 解析到 (5, 10)
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
      line([5, 10]),
    ]);
  });

  it('relative 在 circle 之后：以圆心为锚点（prevEnd 不变）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'circlePath', radius: 10 },
            { type: 'step', kind: 'line', to: { relative: [5, 5] } },
          ],
        },
      ],
    };
    // circle 画完 prevEnd 仍是 (0,0)；relative 解析到 (5,5)
    // ellipseArc 后 lastEnd 是 (10,0)（弧终点）；line 起点是
    // penOverride = center = (0,0)，所以会发 move 然后 line
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
      move([0, 0]),
      line([5, 5]),
    ]);
  });

  it('首步是 relative（无 prevEnd）回退到 [0,0]', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            // 首步 move 用 relative：prevEnd 为 null，回退到 [0,0]，relative 解析到 (5, 3)
            { type: 'step', kind: 'move', to: { relative: [5, 3] } },
            { type: 'step', kind: 'line', to: [10, 3] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([move([5, 3]), line([10, 3])]);
  });

  it('relative 与等价绝对坐标产 IR 不同但 SVG d 相同', () => {
    const irRel: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { relative: [10, 5] } },
            { type: 'step', kind: 'line', to: { relativeAccumulate: [5, 0] } },
          ],
        },
      ],
    };
    const irAbs: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 5] }, // relative 不更新 prevEnd → 但 line 自己更新；这里用绝对值刚好等价
            { type: 'step', kind: 'line', to: [5, 0] }, // relativeAccumulate [5,0] 从 prevEnd (0,0)
          ],
        },
      ],
    };
    // 注意：relative [10,5] 后 prevEnd 留 (0,0)；relativeAccumulate [5,0] 解析到 (0+5, 0+0) = (5,0)
    expect(findPathPrim(compileToScene(irRel).primitives).commands).toEqual(
      findPathPrim(compileToScene(irAbs).primitives).commands,
    );
  });
});
