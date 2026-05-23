import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { arc, close, ellipseArc, line, move } from '../helpers/path-command-factory';

const silent = { onWarn: () => {} };

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

describe('arc 显式 center', () => {
  it('显式 center 决定圆心（非游标 / prev.anchor）', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10, center: [5, 5] },
        ],
      },
    ]);
    // 圆心 = 显式 [5,5]，起点 = (5+10, 5) = (15,5)；不是游标 [0,0]
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([15, 5]),
      arc([5, 5], 10, 0, 90),
    ]);
  });

  it('缺省 center 退回游标（向后兼容，输出不变）', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [3, 3] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
        ],
      },
    ]);
    // 圆心 = 游标 [3,3]，起点 = (13,3)
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([13, 3]),
      arc([3, 3], 10, 0, 90),
    ]);
  });

  it('center 引用未定义节点 → 整 path 跳过', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10, center: { id: 'ghost' } },
        ],
      },
    ]);
    expect(compileToScene(ir, silent).primitives.find(p => p.type === 'path')).toBeUndefined();
  });
});

describe('arc 椭圆弧（radiusX / radiusY）', () => {
  it('椭圆弧 0°→90° → ellipseArc 命令，起点 (cx+rx, cy)', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radiusX: 15, radiusY: 10 },
        ],
      },
    ]);
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([15, 0]),
      ellipseArc([0, 0], 15, 10, 0, 90),
    ]);
  });

  it('椭圆弧 bbox 用 rx/ry 半轴（layout 覆盖端点）', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radiusX: 15, radiusY: 10 },
        ],
      },
    ]);
    // 端点 (15,0) 与 (0,10)；bbox x∈[0,15] y∈[0,10]；padding=10 → [-10,-10,35,30]
    expect(compileToScene(ir, { padding: 10, onWarn: () => {} }).layout).toEqual({
      x: -10,
      y: -10,
      width: 35,
      height: 30,
    });
  });

  it('rx == ry 椭圆弧 与同半径正圆弧 端点一致', () => {
    const ell = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radiusX: 7, radiusY: 7 },
        ],
      },
    ]);
    const cir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 7 },
        ],
      },
    ]);
    // 起点相同（都从 (7,0)）；命令类型不同（ellipseArc vs arc）但几何等价
    const ellCmds = findPathPrim(compileToScene(ell, silent).primitives).commands;
    const cirCmds = findPathPrim(compileToScene(cir, silent).primitives).commands;
    expect(ellCmds[0]).toEqual(move([7, 0]));
    expect(cirCmds[0]).toEqual(move([7, 0]));
  });
});

describe('arc malformed', () => {
  it('既无 radius 也无 radiusX/radiusY → 整 path 跳过', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90 },
        ],
      },
    ]);
    expect(compileToScene(ir, silent).primitives.find(p => p.type === 'path')).toBeUndefined();
  });
});

describe('arc 圆弧回归（输出与改造前一致）', () => {
  it('move[0,0] + arc(0→90, r=10) → M(10,0) arc([0,0],10,0,90)', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10 },
        ],
      },
    ]);
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
    ]);
  });
});

describe('sugar 派发等价（手写 IR）', () => {
  it('Sector 派发 move(arcStart)→arc(center)→line(center)→cycle = 闭合 wedge', () => {
    // center=[0,0] r=10 start=0 end=90 → arcStart=(10,0)、arcEnd=(0,10)
    const ir = scene([
      {
        type: 'path',
        fill: '#eee',
        children: [
          { type: 'step', kind: 'move', to: [10, 0] }, // arcStart
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10, center: [0, 0] },
          { type: 'step', kind: 'line', to: [0, 0] }, // → center
          { type: 'step', kind: 'cycle' },
        ],
      },
    ]);
    // M arcStart, arc(center), L center, Z —— 干净闭合扇形（用 close 收口）
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
      line([0, 0]),
      close(),
    ]);
  });

  it('Arc 开放派发 move(center)→arc(center) = 不闭合纯弧', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] }, // center
          { type: 'step', kind: 'arc', startAngle: 0, endAngle: 90, radius: 10, center: [0, 0] },
        ],
      },
    ]);
    // move 步本身不发命令；arc 的 startSegment 发 M arcStart 再画弧
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      arc([0, 0], 10, 0, 90),
    ]);
  });
});
