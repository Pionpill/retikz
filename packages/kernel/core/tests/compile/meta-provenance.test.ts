/**
 * IR meta provenance 透传：compile 沿 alpha.3 id-stamp 同款通路把 IR 元素 `meta` 原样 stamp 进 Scene 图元
 * @description 覆盖：Node / Path / Scope 三载体各自 stamp 落点（纯几何 Node 平铺图元、文本 Node 的 GroupPrim、
 *   Path 的 PathPrim、Scope 的 GroupPrim）；省略 meta 等价现状（无 meta 键）；meta 不进 every-X 默认；
 *   仅带 meta 的空 scope 照常 prune；非 JSON meta 被 schema 拒；id + meta 共存；layout-neutral；round-trip 自描述。
 *   Coordinate 不加 meta（产 0 图元，schema 不含该字段）。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeDefaultSchema, NodeSchema, PathDefaultSchema, SceneSchema } from '../../src';
import type { IR, ScenePrimitive } from '../../src';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children']): IR => ({
  version: 1,
  type: 'scene',
  children,
});
const silent = { onWarn: () => {} };

const allOfType = (
  prims: ReadonlyArray<ScenePrimitive>,
  type: ScenePrimitive['type'],
): Array<ScenePrimitive> => flattenPrims(prims).filter(p => p.type === type);

const PROV = { source: 'plot', series: 'sales', datum: 3 } as const;

describe('Happy path：三载体 meta stamp 落点', () => {
  it('node_meta_stamped_on_shape_prims：纯几何 Node 带 meta → 每个平铺 shape 图元带同款 meta', () => {
    const ir = scene([{ type: 'node', id: 'a', position: [0, 0], meta: { ...PROV } }]);
    const prims = compileToScene(ir, silent).primitives;
    const rects = allOfType(prims, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) {
      expect(rect.meta).toEqual(PROV);
    }
  });

  it('text_node_meta_on_group：文本 Node 带 meta → 单层 GroupPrim 带 meta，子图元不带', () => {
    const ir = scene([{ type: 'node', id: 'n', position: [0, 0], text: 'A', meta: { ...PROV } }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims).toHaveLength(1);
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].meta).toEqual(PROV);
    // 子图元不重复 stamp
    for (const child of prims[0].children) {
      expect(child.meta).toBeUndefined();
    }
  });

  it('path_meta_on_pathprim：Path 带 meta → PathPrim 带 meta', () => {
    const ir = scene([
      {
        type: 'path',
        id: 'edge1',
        meta: { ...PROV },
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
      expect(path.meta).toEqual(PROV);
    }
  });

  it('scope_meta_on_groupprim：Scope 带 meta → GroupPrim 带 meta，子元素不继承', () => {
    const ir = scene([
      {
        type: 'scope',
        id: 'cluster',
        meta: { ...PROV },
        children: [{ type: 'node', id: 'a', position: [0, 0] }],
      },
    ]);
    const prims = compileToScene(ir, silent).primitives;
    const groups = prims.filter(p => p.type === 'group');
    expect(groups).toHaveLength(1);
    expect(groups[0].meta).toEqual(PROV);
    // 子节点（纯几何）不继承 scope.meta
    const rects = allOfType(prims, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) {
      expect(rect.meta).toBeUndefined();
    }
  });
});

describe('边界', () => {
  it('meta_omitted_equivalent：省略 meta → 图元无 meta 键（非 undefined 值）', () => {
    const ir = scene([{ type: 'node', id: 'a', position: [0, 0] }]);
    const rects = allOfType(compileToScene(ir, silent).primitives, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) {
      expect('meta' in rect).toBe(false);
    }
  });

  it('meta_pruned_scope：仅带 meta 的空 scope 仍被 prune（meta 不构成保留理由）', () => {
    const ir = scene([{ type: 'scope', meta: { ...PROV }, children: [] }]);
    const prims = compileToScene(ir, silent).primitives;
    expect(prims).toHaveLength(0);
  });
});

describe('错误路径：非 JSON meta / meta 不进 every-X 默认', () => {
  it('meta_non_json_rejected：meta 含函数 / undefined / Date / Map → NodeSchema parse reject', () => {
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], meta: { fn: () => 1 } }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], meta: { u: undefined } }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], meta: { d: new Date() } }).success).toBe(false);
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], meta: { m: new Map() } }).success).toBe(false);
    // 合法 JSON 对象通过
    expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], meta: { a: 1, b: 'x', c: [true, null] } }).success).toBe(true);
  });

  it('meta_in_node_default_rejected：nodeDefault / pathDefault 写 meta 被 .strict() 拒', () => {
    expect(NodeDefaultSchema.safeParse({ meta: { ...PROV } }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ meta: { ...PROV } }).success).toBe(false);
  });
});

describe('交互', () => {
  it('id_and_meta_coexist：同图元同时带 id + meta，两者都正确 stamp、互不影响', () => {
    const ir = scene([{ type: 'node', id: 'a', position: [0, 0], meta: { ...PROV } }]);
    const rects = allOfType(compileToScene(ir, silent).primitives, 'rect');
    for (const rect of rects) {
      expect(rect.id).toBe('a');
      expect(rect.meta).toEqual(PROV);
    }
  });

  it('meta_layout_neutral：加 / 删 meta 前后 viewBox / 图元几何不变', () => {
    const without = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], text: 'A' }]), silent);
    const withMeta = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], text: 'A', meta: { ...PROV } }]),
      silent,
    );
    expect(withMeta.layout).toEqual(without.layout);
    // 几何等价：剥掉 meta 后两份 primitives 完全一致
    const strip = (prims: ReadonlyArray<ScenePrimitive>): Array<Record<string, unknown>> =>
      flattenPrims(prims).map(p => {
        const clone: Record<string, unknown> = { ...p };
        delete clone.meta;
        return clone;
      });
    expect(strip(withMeta.primitives)).toEqual(strip(without.primitives));
  });

  it('meta_roundtrip_self_describing：含三载体 meta 的 IR → JSON → parse → 等价', () => {
    const ir = scene([
      { type: 'node', id: 'a', position: [0, 0], meta: { kind: 'node', n: 1 } },
      {
        type: 'path',
        id: 'p',
        meta: { kind: 'path' },
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      },
      { type: 'scope', meta: { kind: 'scope' }, children: [{ type: 'node', id: 'b', position: [5, 5] }] },
    ]);
    const reparsed = SceneSchema.parse(JSON.parse(JSON.stringify(ir)));
    expect(reparsed).toEqual(ir);
  });
});
