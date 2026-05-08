import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { PathPrim, ScenePrimitive } from '../../src/primitive';

const findPathPrim = (prims: Array<ScenePrimitive>): PathPrim => {
  const p = prims.find((x): x is PathPrim => x.type === 'path');
  if (!p) throw new Error('expected a PathPrim in scene');
  return p;
};

describe('compile path: line baseline', () => {
  it('两段 line 产出 M ... L ...', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 5] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    expect(findPathPrim(scene.primitives).d).toBe('M 0 0 L 10 5');
  });
});

describe("compile path: 'step' 折角 (ADR-0001)", () => {
  it("via '-|' 等价于 line(curr.x, prev.y) → line(curr) 拆解", () => {
    const folded: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'step', via: '-|', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] }, // 先水平
            { type: 'step', kind: 'line', to: [10, 5] }, // 再垂直
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(folded).primitives).d).toBe(
      findPathPrim(compileToScene(manual).primitives).d,
    );
  });

  it("via '|-' 等价于 line(prev.x, curr.y) → line(curr) 拆解", () => {
    const folded: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'step', via: '|-', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [0, 5] }, // 先垂直
            { type: 'step', kind: 'line', to: [10, 5] }, // 再水平
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(folded).primitives).d).toBe(
      findPathPrim(compileToScene(manual).primitives).d,
    );
  });

  it('折角中间点参与 viewBox 计算（不会被裁掉）', () => {
    // 起点 (0,0)，终点 (40, 30)，via='-|' → 中点 (40, 0)
    // 三个点的 bbox: x in [0,40], y in [0,30]；padding=10 → viewBox [-10,-10,60,50]
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'step', via: '-|', to: [40, 30] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { padding: 10 });
    expect(scene.viewBox).toEqual({ x: -10, y: -10, width: 60, height: 50 });
  });

  it('折角与节点引用配合：节点 ref 端点贴 boundary 后再插中点', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          id: 'A',
          position: [0, 0],
        },
        {
          type: 'node',
          id: 'B',
          position: [100, 60],
        },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'step', via: '-|', to: 'B' },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const d = findPathPrim(scene.primitives).d;
    const matches = d.match(/[ML]/g);
    expect(matches).toEqual(['M', 'L', 'L']); // M start, L corner, L end
  });

  it('折角中点对齐节点几何中心，不取 boundary 偏移（bugfix）', () => {
    // A=(0,0)，B=(100,60)，无文本默认 width=height=2*padding=16
    // 期望 corner = (B.center.x=100, A.center.y=0)
    // A 端点向 (100, 0) 切 boundary → A.east = (8, 0)
    // B 端点向 (100, 0) 切 boundary → B.north = (100, 52)
    // 路径："M 8 0 L 100 0 L 100 52"
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'step', via: '-|', to: 'B' },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    expect(d).toBe('M 8 0 L 100 0 L 100 52');
  });

  it("via '|-' 中点对齐：corner = (A.center.x, B.center.y)", () => {
    // A=(0,0)，B=(100,60)，无文本 16x16
    // |- corner = (A.x=0, B.y=60)
    // A 端点向 (0, 60) → A.south = (0, 8)
    // B 端点向 (0, 60) → B.west = (92, 60)
    // 路径："M 0 8 L 0 60 L 92 60"
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: 'A' },
            { type: 'step', kind: 'step', via: '|-', to: 'B' },
          ],
        },
      ],
    };
    const d = findPathPrim(compileToScene(ir).primitives).d;
    expect(d).toBe('M 0 8 L 0 60 L 92 60');
  });
});
