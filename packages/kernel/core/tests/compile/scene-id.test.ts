/**
 * compile 把 IR 元素 user id stamp 到 emit 图元 测试（TDD red）
 * @description 覆盖水合挂点：纯几何 Node 逐个平铺 shape 图元 stamp 同一 id、带文本 Node 的 GroupPrim
 *   带 id、Path 的 PathPrim 带 id、Scope 的 GroupPrim 带 id、无 id 元素 emit 图元不含 id、
 *   Coordinate 无视觉不 emit 任何 ScenePrimitive。
 *   ⚠️ 本文件断言"期望的正确行为"——compile stamp 尚未实现，大部分 case 此刻预计 fail（预期 TDD red）。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR, ScenePrimitive } from '../../src';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});
const silent = { onWarn: () => {} };

/** 摊平后取某 type 的全部图元 */
const allOfType = (
  prims: ReadonlyArray<ScenePrimitive>,
  type: ScenePrimitive['type'],
): Array<ScenePrimitive> => flattenPrims(prims).filter(p => p.type === type);

describe('纯几何 Node（无文本 / 无 rotate）带 id → 平铺 shape 图元逐个 stamp 同一 id', () => {
  it('rectangle 纯几何 Node 带 id → 其 RectPrim 带该 id（不强制包 group）', () => {
    const ir = scene([{ type: 'node', id: 'a', position: [0, 0] }]);
    const prims = compileToScene(ir, silent).primitives;
    // 纯几何 rectangle → 平铺 RectPrim，不包 group
    expect(prims.map(p => p.type)).toEqual(['rect']);
    const rects = allOfType(prims, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) {
      expect(rect.id).toBe('a');
    }
  });

  it('circle 纯几何 Node 带 id → 其 EllipsePrim 带该 id', () => {
    const ir = scene([{ type: 'node', id: 'c', position: [0, 0], shape: 'circle' }]);
    const prims = compileToScene(ir, silent).primitives;
    const ellipses = allOfType(prims, 'ellipse');
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
    for (const ellipse of ellipses) {
      expect(ellipse.id).toBe('c');
    }
  });
});

describe('带文本 Node 带 id → 落成的 GroupPrim 带该 id', () => {
  it('文本 Node 带 id → 顶层 GroupPrim.id = id', () => {
    const ir = scene([{ type: 'node', id: 'n', position: [0, 0], text: 'A' }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims).toHaveLength(1);
    expect(prims[0].type).toBe('group');
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].id).toBe('n');
  });
});

describe('Path 带 id → 其 PathPrim 带该 id', () => {
  it('两段 line 的 Path 带 id → PathPrim.id = id', () => {
    const ir = scene([
      {
        type: 'path',
        id: 'edge1',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 5] },
        ],
      },
    ]);
    const prims = compileToScene(ir, silent).primitives;
    const paths = allOfType(prims, 'path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    for (const path of paths) {
      expect(path.id).toBe('edge1');
    }
  });
});

describe('Scope 带 id → 其 GroupPrim 带该 id', () => {
  it('scope 带 id（含纯几何子节点）→ 该 scope 的 GroupPrim.id = id', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'cluster',
        children: [{ type: 'node', id: 'a', position: [0, 0] }],
      },
    ]);
    const prims = compileToScene(ir, silent).primitives;
    // 子节点是纯几何（不包 group），故顶层唯一 group 即 scope 自身
    const groups = prims.filter(p => p.type === 'group');
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe('cluster');
  });
});

describe('无 id 的元素 → emit 图元不含 id', () => {
  it('无 id 的纯几何 Node → RectPrim.id 为 undefined', () => {
    const ir = scene([{ type: 'node', position: [0, 0] }]);
    const prims = compileToScene(ir, silent).primitives;
    const rects = allOfType(prims, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) {
      expect(rect.id).toBeUndefined();
    }
  });

  it('无 id 的 Path → PathPrim.id 为 undefined', () => {
    const ir = scene([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 5] },
        ],
      },
    ]);
    const prims = compileToScene(ir, silent).primitives;
    const paths = allOfType(prims, 'path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    for (const path of paths) {
      expect(path.id).toBeUndefined();
    }
  });
});

describe('Coordinate（无视觉）→ 不 emit 任何 ScenePrimitive', () => {
  it('带 id 的 coordinate → primitives 中无对应图元（id 无处可挂、不报错）', () => {
    const ir = scene([{ type: 'coordinate', id: 'm', position: [3, 2] }]);
    expect(() => compileToScene(ir, silent)).not.toThrow();
    const prims = compileToScene(ir, silent).primitives;
    expect(prims).toHaveLength(0);
  });
});
