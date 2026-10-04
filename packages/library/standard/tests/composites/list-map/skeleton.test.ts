import type { IRChild, ScenePrimitive } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { PathClipDefinition } from '@retikz/extension';
import { describe, expect, it } from 'vitest';

import { createList, createMap, ListDefinition, ListSchema, MapDefinition, MapSchema } from '../../../src/collection';
import type { IRList } from '../../../src/collection';

const compile = (child: IRChild) =>
  compileToScene(
    { type: 'scene', version: 1, children: [child] },
    { composites: [ListDefinition, MapDefinition], clips: [PathClipDefinition], padding: 0 },
  );
const flat = (nodes: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  nodes.flatMap(node => (node.type === 'group' ? flat(node.children) : [node]));
const listBase = { namespace: 'standard', type: 'list' } as const;
const mapBase = { namespace: 'standard', type: 'map' } as const;

describe('示意骨架的 Source 契约', () => {
  it('保留数量或符号入口及 JSON 往返，不物化显式结构', () => {
    for (const skeleton of [{ count: 0 }, { count: 3 }, { labels: [] }, { labels: ['x₁', '', 'x₁'] }]) {
      const source = createList({ ...listBase, skeleton });
      const parsed = ListSchema.parse(JSON.parse(JSON.stringify(source)));
      expect(parsed.skeleton).toEqual(skeleton);
      expect(source).not.toHaveProperty('items');
      expect(parsed).not.toHaveProperty('items');
    }
    const skeleton = { keys: ['k', '', 'k'] };
    const source = createMap({ ...mapBase, skeleton });
    expect(MapSchema.parse(JSON.parse(JSON.stringify(source))).skeleton).toEqual(skeleton);
    expect(source).not.toHaveProperty('entries');
  });
  it.each([
    {},
    { count: -1 },
    { count: 0.5 },
    { count: Infinity },
    { count: Number.MAX_SAFE_INTEGER + 1 },
    { count: 1, labels: ['x'] },
    { labels: [1] },
    { labels: ['x'], extra: true },
  ])('拒绝非法 List 骨架并保留字段诊断 %j', skeleton => {
    const parsed = ListSchema.safeParse({ ...listBase, skeleton });
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(JSON.stringify(parsed.error.issues)).toContain('skeleton');
  });
  it('拒绝互斥入口、非法 Map 键及骨架专属限制', () => {
    for (const fields of [
      { items: [] },
      { data: [] },
      { dataExpand: false },
      { cellIdMode: 'string' },
      { cellIdMode: 'index' },
    ]) {
      expect(ListSchema.safeParse({ ...listBase, skeleton: { count: 0 }, ...fields }).success).toBe(false);
    }
    for (const fields of [{ entries: [] }, { data: {} }, { dataExpand: true }]) {
      expect(MapSchema.safeParse({ ...mapBase, skeleton: { keys: [] }, ...fields }).success).toBe(false);
    }
    for (const skeleton of [{}, { keys: [1] }, { keys: [], count: 0 }]) {
      expect(MapSchema.safeParse({ ...mapBase, skeleton }).success).toBe(false);
    }
    expect(ListSchema.parse({ ...listBase, id: 'v', cellIdMode: 'index', skeleton: { count: 1 } }).id).toBe('v');
  });
  it('格外标号匹配所有入口且不注入自动起点', () => {
    for (const source of [{ items: ['a', 'b'] }, { data: [1, 2] }, { skeleton: { labels: ['x', 'y'] } }]) {
      expect(ListSchema.parse({ ...listBase, ...source, index: { labels: ['', 'i'] } }).index).toEqual({
        position: 'before',
        labels: ['', 'i'],
      });
      expect(ListSchema.safeParse({ ...listBase, ...source, index: { labels: ['i'] } }).success).toBe(false);
      expect(ListSchema.safeParse({ ...listBase, ...source, index: { labels: ['i', 'j'], start: 0 } }).success).toBe(
        false,
      );
    }
    expect(ListSchema.safeParse({ ...listBase, skeleton: { count: 0 }, index: { labels: [] } }).success).toBe(true);
    expect(ListSchema.safeParse({ ...listBase, skeleton: { count: 0 }, index: { position: 'inside' } }).success).toBe(
      false,
    );
  });
  it('显式空内容有效且 Map 角色仍然必填', () => {
    expect(ListSchema.parse({ ...listBase, items: [{}, { content: '' }] }).items).toEqual([{}, { content: '' }]);
    expect(MapSchema.parse({ ...mapBase, entries: [{ key: {}, value: {} }] }).entries).toEqual([
      { key: {}, value: {} },
    ]);
    expect(MapSchema.safeParse({ ...mapBase, entries: [{ key: {} }] }).success).toBe(false);
  });
});

describe('示意骨架的布局、文字与身份', () => {
  it.each(['row', 'column'] as const)('空格和混合符号在 %s 方向与显式结构等价', direction => {
    const props = {
      ...listBase,
      id: 'vector',
      cellIdMode: 'index' as const,
      layout: { direction, width: 40, height: 30, padding: 4 },
      index: { labels: ['i', '', 'j'], position: 'after' as const },
    };
    for (const [skeleton, items] of [
      [{ count: 3 }, [{}, {}, {}]],
      [{ labels: ['x', '', 'x'] }, [{ content: 'x' }, {}, { content: 'x' }]],
    ] satisfies Array<[NonNullable<IRList['skeleton']>, Array<{} | { content: string }>]>) {
      const actual = compile({ ...props, skeleton });
      const explicit = compile({ ...props, items });
      expect(actual.scene).toEqual(explicit.scene);
      expect(actual.spatialHandles).toEqual(explicit.spatialHandles);
      expect(actual.spatialHandles.entries.filter(entry => entry.role === 'list-cell').map(entry => entry.id)).toEqual([
        'cell:vector-0',
        'cell:vector-1',
        'cell:vector-2',
      ]);
    }
  });
  it('Map 保留有序重复键及空值，与显式结构等价且不推导身份', () => {
    const props = {
      ...mapBase,
      layout: { key: { width: 40 }, value: { width: 60, height: 30 } },
      style: { value: { fill: 'blue' } },
    };
    const actual = compile({ ...props, skeleton: { keys: ['k', '', 'k'] } });
    const explicit = compile({ ...props, entries: ['k', '', 'k'].map(key => ({ key, value: {} })) });
    expect(actual.scene).toEqual(explicit.scene);
    expect(actual.spatialHandles.entries.some(entry => entry.role === 'map-key' || entry.role === 'map-value')).toBe(
      false,
    );
  });
  it('无内容不产生文字图元，默认 padding 和零 padding 都有效', () => {
    for (const padding of [undefined, 0, 3]) {
      const actual = compile({
        ...listBase,
        skeleton: { count: 1 },
        layout: { padding },
        style: { font: { size: 80 } },
      });
      expect(flat(actual.scene.primitives).some(node => node.type === 'text')).toBe(false);
      const side = (padding ?? 8) * 2;
      expect(actual.spatialHandles.entries.find(entry => entry.role === 'container')?.geometry.bounds).toEqual({
        x: 0,
        y: 0,
        width: side,
        height: side,
      });
    }
  });
  it('空骨架没有格子、索引和间距', () => {
    for (const child of [
      { ...listBase, skeleton: { count: 0 }, index: true },
      { ...listBase, skeleton: { labels: [] }, index: { labels: [] } },
      { ...mapBase, skeleton: { keys: [] } },
    ]) {
      const actual = compile(child);
      expect(flat(actual.scene.primitives)).toEqual([]);
      expect(actual.spatialHandles.entries.find(entry => entry.role === 'container')?.geometry.bounds).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    }
  });
  it('格内符号与自动或显式格外标号独立，全部空标号不留空间', () => {
    const base = { ...listBase, skeleton: { labels: ['x₁', '', 'x₁'] }, layout: { width: 40, height: 30 } };
    const texts = (index: IRList['index']) =>
      flat(compile({ ...base, index }).scene.primitives).flatMap(node =>
        node.type === 'text' ? node.lines.map(line => line.text) : [],
      );
    expect(texts({ start: 1 })).toEqual(['x₁', 'x₁', '1', '2', '3']);
    expect(texts({ labels: ['a', '', 'a'] })).toEqual(['x₁', 'x₁', 'a', 'a']);
    const hidden = compile({ ...base, index: false });
    const blanks = compile({ ...base, index: { labels: ['', '', ''] } });
    expect(blanks.scene).toEqual(hidden.scene);
    expect(blanks.spatialHandles).toEqual(hidden.spatialHandles);
  });
});
