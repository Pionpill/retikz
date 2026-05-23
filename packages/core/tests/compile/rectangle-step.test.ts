import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { RectangleStepSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';
import { arc, close, line, move } from '../helpers/path-command-factory';

const silent = { onWarn: () => {} };

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });
const path = (...steps: Array<unknown>): IR => scene([{ type: 'path', children: steps as never }]);

describe('rectangle step：直角', () => {
  it('两对角 → M(x0,y0) 顺时针 4 line + close', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([10, 6]),
      line([0, 6]),
      close(),
    ]);
  });

  it('from/to 逆序结果相同（归一化对角）', () => {
    const a = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] },
    );
    const b = path(
      { type: 'step', kind: 'move', to: [10, 6] },
      { type: 'step', kind: 'rectangle', from: [10, 6], to: [0, 0] },
    );
    expect(findPathPrim(compileToScene(b, silent).primitives).commands).toEqual(
      findPathPrim(compileToScene(a, silent).primitives).commands,
    );
  });

  it('roundedCorners=0 等价直角', () => {
    const sharp = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] },
    );
    const zero = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6], roundedCorners: 0 },
    );
    expect(findPathPrim(compileToScene(zero, silent).primitives).commands).toEqual(
      findPathPrim(compileToScene(sharp, silent).primitives).commands,
    );
  });
});

describe('rectangle step：圆角', () => {
  it('roundedCorners=2 → 起点 (x0+r,y0)，4 line + 4 quarter-arc + close', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6], roundedCorners: 2 },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([2, 0]),
      line([8, 0]),
      arc([8, 2], 2, 270, 360),
      line([10, 4]),
      arc([8, 4], 2, 0, 90),
      line([2, 6]),
      arc([2, 4], 2, 90, 180),
      line([0, 2]),
      arc([2, 2], 2, 180, 270),
      close(),
    ]);
  });

  it('roundedCorners 超过边长一半 → clamp 到 min(w,h)/2', () => {
    // w=10 h=6 → 半=min(5,3)=3；r=100 应 clamp 到 3
    const clamped = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6], roundedCorners: 100 },
    );
    const r3 = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6], roundedCorners: 3 },
    );
    expect(findPathPrim(compileToScene(clamped, silent).primitives).commands).toEqual(
      findPathPrim(compileToScene(r3, silent).primitives).commands,
    );
  });
});

describe('rectangle step：pen / 组合', () => {
  it('rectangle 后接 line：起点 = (x0,y0)（penOverride），close 后续线从矩形起点', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] },
      { type: 'step', kind: 'line', to: [20, 20] },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([0, 0]),
      line([10, 0]),
      line([10, 6]),
      line([0, 6]),
      close(),
      line([20, 20]),
    ]);
  });

  it('line → rectangle → line：矩形总起新子路径（close 闭回自身起点）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [5, 0] },
      { type: 'step', kind: 'rectangle', from: [5, 0], to: [15, 6] },
      { type: 'step', kind: 'line', to: [20, 20] },
    );
    expect(findPathPrim(compileToScene(ir, silent).primitives).commands).toEqual([
      move([0, 0]),
      line([5, 0]),
      move([5, 0]), // 矩形起新子路径（即便 pen 已在 (5,0)）
      line([15, 0]),
      line([15, 6]),
      line([5, 6]),
      close(),
      line([20, 20]),
    ]);
  });

  it('rectangle bbox = 外接矩形（layout 覆盖四角）', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] },
    );
    expect(compileToScene(ir, { padding: 10, onWarn: () => {} }).layout).toEqual({
      x: -10,
      y: -10,
      width: 30,
      height: 26,
    });
  });
});

describe('rectangle step：node ref 角 + schema', () => {
  it('from/to 引用未定义节点 → 整 path 跳过', () => {
    const ir = path(
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'rectangle', from: { id: 'ghost' }, to: [10, 6] },
    );
    expect(compileToScene(ir, silent).primitives.find(p => p.type === 'path')).toBeUndefined();
  });

  it('缺 to → schema 拒（from/to 必填）', () => {
    expect(
      RectangleStepSchema.safeParse({ type: 'step', kind: 'rectangle', from: [0, 0] }).success,
    ).toBe(false);
  });
});
