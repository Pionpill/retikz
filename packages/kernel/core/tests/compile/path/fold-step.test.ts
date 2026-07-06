import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { line, move } from '../../helpers/path-command-factory';
import { findPathPrim } from './helpers';

describe("compile path: 'step' 折角", () => {
  it("via '-|' 等价于 line(curr.x, prev.y) → line(curr) 拆解", () => {
    const folded: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IRScene = {
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
    expect(findPathPrim(compileToScene(folded).primitives).commands).toEqual(
      findPathPrim(compileToScene(manual).primitives).commands,
    );
  });

  it("via '|-' 等价于 line(prev.x, curr.y) → line(curr) 拆解", () => {
    const folded: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '|-', to: [10, 5] },
          ],
        },
      ],
    };
    const manual: IRScene = {
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
    expect(findPathPrim(compileToScene(folded).primitives).commands).toEqual(
      findPathPrim(compileToScene(manual).primitives).commands,
    );
  });

  it('折角中间点参与 layout 计算（不会被裁掉）', () => {
    // 起点 (0,0)，终点 (40, 30)，via='-|' → 中点 (40, 0)
    // 三个点的 bbox: x in [0,40], y in [0,30]；padding=10 → layout [-10,-10,60,50]
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'fold', via: '-|', to: [40, 30] },
          ],
        },
      ],
    };
    const scene = compileToScene(ir, { padding: 10 });
    expect(scene.layout).toEqual({ x: -10, y: -10, width: 60, height: 50 });
  });

  it('折角与节点引用配合：节点 ref 端点贴 boundary 后再插中点', () => {
    const ir: IRScene = {
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
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
          ],
        },
      ],
    };
    const scene = compileToScene(ir);
    const commands = findPathPrim(scene.primitives).commands;
    expect(commands.map(c => c.kind)).toEqual(['move', 'line', 'line']); // M start, L corner, L end
  });

  it('折角中点对齐节点几何中心，不取 boundary 偏移（bugfix）', () => {
    // A=(0,0)，B=(100,60)，无文本默认 width=height=2*padding=16
    // 期望 corner = (B.center.x=100, A.center.y=0)
    // A 端点向 (100, 0) 切 boundary → A.right = (8, 0)
    // B 端点向 (100, 0) 切 boundary → B.top = (100, 52)
    // 路径："M 8 0 L 100 0 L 100 52"
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '-|', to: { id: 'B' } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([
      move([8, 0]),
      line([100, 0]),
      line([100, 52]),
    ]);
  });

  it("via '|-' 中点对齐：corner = (A.center.x, B.center.y)", () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0] },
        { type: 'node', id: 'B', position: [100, 60] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'A' } },
            { type: 'step', kind: 'fold', via: '|-', to: { id: 'B' } },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).commands).toEqual([move([0, 8]), line([0, 60]), line([92, 60])]);
  });
});
