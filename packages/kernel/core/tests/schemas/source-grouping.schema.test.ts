import { describe, expect, it } from 'vitest';

import { NodeSchema, PathBaseSchema, ScopeSchema, StrokePathSchema } from '../../src/schemas';

describe('Source 语义分组', () => {
  it('节点的视觉和布局字段使用各自的闭合命名空间', () => {
    const source = {
      type: 'node',
      position: [0, 0],
      scale: { x: 2 },
      style: { fill: 'red', opacity: 0, dashed: false, font: { size: 12 } },
      layout: { padding: 0, minimumSize: { width: 20 } },
    };
    expect(NodeSchema.parse(source)).toEqual(source);
    for (const invalid of [
      { fill: 'red' },
      { padding: 2 },
      { style: { padding: 2 } },
      { layout: { fill: 'red' } },
      { layout: { scale: 2 } },
      { style: { unknown: 1 } },
    ])
      expect(NodeSchema.safeParse({ type: 'node', position: [0, 0], ...invalid }).success).toBe(false);
  });

  it('空分组和合法 undefined 由 owner schema 保留', () => {
    const source = { type: 'node', position: [0, 0], style: { fill: undefined }, layout: {} };
    expect(NodeSchema.parse(source)).toEqual(source);
    expect(
      ScopeSchema.parse({ type: 'scope', children: [], style: {}, defaults: { node: {}, reset: false } }),
    ).toMatchObject({ style: {}, defaults: { node: {}, reset: false } });
  });

  it('Scope 只接收允许级联的字段和具名默认通道', () => {
    const source = {
      type: 'scope',
      children: [],
      style: { stroke: 'blue' },
      defaults: {
        node: { style: { font: { size: 12 } }, layout: { padding: 0 } },
        path: { style: { lineCap: 'round' } },
        label: { font: { size: 10 } },
        arrow: { scale: 2 },
        reset: ['node'],
      },
    };
    expect(ScopeSchema.parse(source)).toEqual(source);
    for (const invalid of [
      { nodeDefault: {} },
      { resetStyle: false },
      { style: { font: {} } },
      { defaults: { node: { id: 'bad' } } },
    ]) {
      expect(ScopeSchema.safeParse({ type: 'scope', children: [], ...invalid }).success).toBe(false);
    }
  });

  it('通用 Path 保留开放 host，Stroke 独立要求步骤', () => {
    expect(
      PathBaseSchema.parse({ type: 'path', kind: 'custom', style: { fillRule: 'evenodd', stroke: 'red' } }),
    ).toMatchObject({ kind: 'custom', style: { fillRule: 'evenodd' } });
    expect(StrokePathSchema.safeParse({ type: 'path', style: {} }).success).toBe(false);
    expect(PathBaseSchema.safeParse({ type: 'path', stroke: 'red' }).success).toBe(false);
  });
});
