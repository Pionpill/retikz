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
});
