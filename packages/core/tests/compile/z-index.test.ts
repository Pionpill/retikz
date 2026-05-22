import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema, ScopeSchema } from '../../src/ir';
import type { IR } from '../../src/ir';
import type { GroupPrim, ScenePrimitive } from '../../src/primitive';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const node = (
  position: [number, number],
  zIndex?: number,
): IR['children'][number] => ({
  type: 'node',
  position,
  ...(zIndex !== undefined && { zIndex }),
});

const line = (
  to: [number, number],
  zIndex?: number,
): IR['children'][number] => ({
  type: 'path',
  ...(zIndex !== undefined && { zIndex }),
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to },
  ],
});

const silent = { onWarn: () => {} };

const topGroup = (result: { primitives: Array<ScenePrimitive> }): GroupPrim => {
  const g = result.primitives.find((p): p is GroupPrim => p.type === 'group');
  if (!g) throw new Error('expected a top-level GroupPrim');
  return g;
};

// ===========================================================================
// Happy path
// ===========================================================================

describe('compile zIndex 稳定排序', () => {
  it('高 zIndex 的 path 排到所有默认 0 的 node 之后', () => {
    const ir = scene([node([0, 0]), line([10, 0], 5), node([20, 0])]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual([
      'rect',
      'rect',
      'path',
    ]);
  });

  it('负 zIndex 排到默认 0 之前', () => {
    const ir = scene([node([0, 0]), line([10, 0], -1)]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual([
      'path',
      'rect',
    ]);
  });

  it('同 zIndex 保持 IR 顺序（稳定）', () => {
    const ir = scene([line([10, 0], 1), node([0, 0], 1), line([20, 0], 1)]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual([
      'path',
      'rect',
      'path',
    ]);
  });

  it('scope.zIndex 让整组作为一个单位在父层排序', () => {
    const ir = scene([
      node([0, 0]),
      { type: 'scope', zIndex: 5, children: [node([10, 0], 0)] },
      node([20, 0]),
    ]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual([
      'rect',
      'rect',
      'group',
    ]);
  });

  // =========================================================================
  // 边界
  // =========================================================================

  it('全部缺省 zIndex 时输出顺序 = IR 顺序（恒等）', () => {
    const ir = scene([node([0, 0]), line([10, 0]), node([20, 0])]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual([
      'rect',
      'path',
      'rect',
    ]);
  });

  it('单元素 + zIndex 不报错也不改', () => {
    const ir = scene([node([0, 0], 99)]);
    expect(compileToScene(ir, silent).primitives.map(p => p.type)).toEqual(['rect']);
  });

  // =========================================================================
  // 错误路径（schema 守卫）
  // =========================================================================

  it('nodeDefault.zIndex 被 ScopeSchema 拒（strict + omit）', () => {
    expect(() =>
      ScopeSchema.parse({ type: 'scope', nodeDefault: { zIndex: 1 }, children: [] }),
    ).toThrow();
  });

  it('pathDefault.zIndex 被 ScopeSchema 拒', () => {
    expect(() =>
      ScopeSchema.parse({ type: 'scope', pathDefault: { zIndex: 1 }, children: [] }),
    ).toThrow();
  });

  it('非整数 / 非有限 zIndex 被 NodeSchema 拒', () => {
    expect(() => NodeSchema.parse({ type: 'node', position: [0, 0], zIndex: 1.5 })).toThrow();
    expect(() =>
      NodeSchema.parse({ type: 'node', position: [0, 0], zIndex: Infinity }),
    ).toThrow();
  });

  // =========================================================================
  // 交互
  // =========================================================================

  it('scope 内独立排序，不跨 group 比较', () => {
    const ir = scene([
      node([100, 0], 9),
      { type: 'scope', children: [node([0, 0]), line([10, 0], 5), node([20, 0])] },
    ]);
    const result = compileToScene(ir, silent);
    // 顶层：scope 的 group（默认 0）排在 node(z=9) 之前
    expect(result.primitives.map(p => p.type)).toEqual(['group', 'rect']);
    // scope 内：line(z=5) 排到两 node 之后
    expect(topGroup(result).children.map(p => p.type)).toEqual(['rect', 'rect', 'path']);
  });

  it('scope.zIndex 不影响 scope 内部子元素的相对栈序', () => {
    const baseChildren: IR['children'] = [node([0, 0]), line([10, 0], 5), node([20, 0])];
    const innerOf = (ir: IR): Array<string> =>
      topGroup(compileToScene(ir, silent)).children.map(p => p.type);
    const withZ = scene([{ type: 'scope', zIndex: 3, children: baseChildren }]);
    const withoutZ = scene([{ type: 'scope', children: baseChildren }]);
    expect(innerOf(withZ)).toEqual(['rect', 'rect', 'path']);
    expect(innerOf(withZ)).toEqual(innerOf(withoutZ));
  });

  it('transformed scope 内 path 按自身 zIndex 在顶层排（hoist 限制延续）', () => {
    const ir = scene([
      node([100, 0]),
      {
        type: 'scope',
        transforms: [{ kind: 'translate', x: 5, y: 3 }],
        children: [node([0, 0]), line([10, 0], 9)],
      },
    ]);
    const result = compileToScene(ir, silent);
    // hoist 的 path（z=9）排到顶层末尾；scope 的 group（z=0）与顶层 node（z=0）保 IR 序在前
    expect(result.primitives.map(p => p.type)).toEqual(['rect', 'group', 'path']);
    // group 内只含 node 的 rect，不含 hoist 出去的 path
    expect(topGroup(result).children.map(p => p.type)).toEqual(['rect']);
  });
});
