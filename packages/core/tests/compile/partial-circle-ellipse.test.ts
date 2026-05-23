import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { close, ellipseArc, line, move } from '../helpers/path-command-factory';

const silent = { onWarn: () => {} };

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const path = (...steps: Array<unknown>): IR =>
  scene([{ type: 'path', children: steps as never }]);

describe('部分 circlePath', () => {
  it('半圆（0→180, chord 默认）→ M, ellipseArc, close', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 180 },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 180),
      close(),
    ]);
  });

  it('open 模式 → 无 close（纯弧）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 180, closed: 'open' },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 180),
    ]);
  });

  it('整圆（无角度）输出与改造前一致', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10 },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
    ]);
  });

  it('start > end 跨向（90→0）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 90, endAngle: 0 },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([0, 10]),
      ellipseArc([0, 0], 10, 10, 90, 0),
      close(),
    ]);
  });
});

describe('部分 ellipsePath', () => {
  it('1/4 椭圆（rx=15 ry=10, 0→90, chord）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'ellipsePath', radiusX: 15, radiusY: 10, startAngle: 0, endAngle: 90 },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([15, 0]),
      ellipseArc([0, 0], 15, 10, 0, 90),
      close(),
    ]);
  });

  it('整椭圆（无角度）不变', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'ellipsePath', radiusX: 15, radiusY: 10 },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([15, 0]),
      ellipseArc([0, 0], 15, 10, 0, 360),
    ]);
  });
});

describe('pen 语义（逐模式，后接 line 验起点）', () => {
  it('open：后续 line 从 arcEnd 起（无额外 move）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 180, closed: 'open' },
      { type: 'step', kind: 'line', to: [50, 50] },
    );
    // arcEnd = (-10, 0)；line 从 arcEnd 直接续，无中间 move
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 180),
      line([50, 50]),
    ]);
  });

  it('chord：后续 line 从 arcStart 起（close 后笔位回 startPt）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 180 },
      { type: 'step', kind: 'line', to: [50, 50] },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 180),
      close(),
      line([50, 50]),
    ]);
  });

  it('full：后续 line 从 center 起（penOverride=center → 发 move）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10 },
      { type: 'step', kind: 'line', to: [50, 50] },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([10, 0]),
      ellipseArc([0, 0], 10, 10, 0, 360),
      move([0, 0]),
      line([50, 50]),
    ]);
  });
});

describe('错误 / 回退（sugar+compile 而非 safeParse）', () => {
  it('单给 startAngle → 视整圆 + warn', () => {
    const warnings: Array<string> = [];
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0 },
    );
    const cmds = findPathPrim(
      compileToScene(ir, { onWarn: w => warnings.push(w.code) }).primitives,
    ).commands;
    expect(cmds).toEqual([move([10, 0]), ellipseArc([0, 0], 10, 10, 0, 360)]);
    expect(warnings).toContain('PARTIAL_ARC_NEEDS_BOTH_ANGLES');
  });

  it("有角度 + closed:'closed' → warn 回退 chord", () => {
    const warnings: Array<string> = [];
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'circlePath', radius: 10, startAngle: 0, endAngle: 180, closed: 'closed' },
    );
    const cmds = findPathPrim(
      compileToScene(ir, { onWarn: w => warnings.push(w.code) }).primitives,
    ).commands;
    expect(cmds).toEqual([move([10, 0]), ellipseArc([0, 0], 10, 10, 0, 180), close()]);
    expect(warnings).toContain('PARTIAL_ARC_CLOSED_INVALID');
  });
});
