import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import { ArraySchema } from '../../../src/collection/array/schema';
import { MapLayoutSchema, MapSchema } from '../../../src/collection/map/schema';

const content = { type: 'node', position: [0, 0], text: 'a' };

const parseExternal = (schema: ZodType, source: unknown) => schema.safeParse(source);
it('保留 Map 的默认间距以及显式零和独立行列间距', () => {
  expect(MapLayoutSchema.parse({}).gap).toBe(2);
  expect(MapLayoutSchema.parse({ gap: 0 }).gap).toBe(0);
  expect(MapLayoutSchema.parse({ gap: { row: 0, column: 4 } }).gap).toEqual({ row: 0, column: 4 });
});
it('解析索引简写、对象默认值和 JSON 文本样式', () => {
  const base = { namespace: 'standard', type: 'array', items: ['A'] };

  expect(ArraySchema.parse(base).index).toBe(false);
  expect(ArraySchema.parse({ ...base, index: true }).index).toBe(true);
  expect(ArraySchema.parse({ ...base, index: {} }).index).toEqual({ position: 'before', start: 0 });

  const index = { position: 'after', start: 2, style: { font: { size: 24 }, textColor: 'red', opacity: 0 } };

  expect(ArraySchema.parse(JSON.parse(JSON.stringify({ ...base, index }))).index).toEqual(index);
});
it('默认将 Array 字符串视为内容，并在启用时验证派生 id', () => {
  const base = { namespace: 'standard', type: 'array' };
  const items = ['A', 'A', '', '   ', { content: 'B', id: 'A' }];

  expect(ArraySchema.parse({ ...base, items }).items).toEqual(items);
  expect(ArraySchema.parse({ ...base, items }).cellIdMode).toBe('explicit');
  expect(ArraySchema.parse({ ...base, items: ['A'], cellIdMode: 'string' }).cellIdMode).toBe('string');

  for (const invalidItems of [[''], ['   '], ['A', 'A'], ['A', { content: 'B', id: 'A' }]]) {
    expect(ArraySchema.safeParse({ ...base, items: invalidItems, cellIdMode: 'string' }).success).toBe(false);
  }

  expect(ArraySchema.parse({ ...base, items: [{ content: 'A' }, { content: 'A' }] }).items).toHaveLength(2);
  expect(
    ArraySchema.safeParse({
      ...base,
      items: [
        { content: 'A', id: 'same' },
        { content: 'B', id: 'same' },
      ],
    }).success,
  ).toBe(false);
});
describe('Array / Map Source 契约', () => {
  it('通过共享默认值和精确的无效成员诊断来保留扩展选择', () => {
    for (const [schema, source] of [
      [ArraySchema, { namespace: 'standard', type: 'array', data: [{ a: 1 }] }],
      [MapSchema, { namespace: 'standard', type: 'map', data: { value: { a: 1 } } }],
    ] as const) {
      expect(schema.parse(source).dataExpand).toBe(true);

      for (const dataExpand of [true, false, [], ['map'], ['array'], ['array', 'map'], ['map', 'map']]) {
        const parsed = schema.parse(JSON.parse(JSON.stringify({ ...source, dataExpand })));

        expect(parsed.dataExpand).toEqual(dataExpand);
        expect(JSON.stringify(parsed.data)).toBe(JSON.stringify(source.data));
      }

      for (const dataExpand of ['map', 'text', null, {}, 0, ['unknown'], [false]]) {
        expect(parseExternal(schema, { ...source, dataExpand }).success).toBe(false);
      }

      const result = parseExternal(schema, { ...source, dataExpand: ['map', 'unknown'] });

      expect(result.success).toBe(false);

      if (!result.success) expect(JSON.stringify(result.error.issues)).toContain('dataExpand');

      expect(parseExternal(schema, { ...source, dataObjectDisplay: 'text' }).success).toBe(false);
    }

    expect(ArraySchema.safeParse({ namespace: 'standard', type: 'array', items: [], dataExpand: false }).success).toBe(
      false,
    );
    expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [], dataExpand: [] }).success).toBe(
      false,
    );
  });

  it('仅接受 JSON 往返后 Array 整体和直接单元格的内容宽度', () => {
    const source = {
      namespace: 'standard',
      type: 'array',
      items: [{ content: 'A', layout: { width: 'content' } }],
      defaultCell: { layout: { width: 'content' } },
    };
    const parsed = ArraySchema.parse(JSON.parse(JSON.stringify(source)));

    expect(parsed.defaultCell?.layout?.width).toBe('content');
    expect(parsed.items?.[0]).toMatchObject({ layout: { width: 'content' } });

    for (const defaultCell of [
      { layout: { width: 'content' } },
      { key: { layout: { width: 'content' } } },
      { value: { layout: { width: 'content' } } },
    ]) {
      expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [], defaultCell }).success).toBe(false);
    }

    expect(
      MapSchema.safeParse({
        namespace: 'standard',
        type: 'map',
        entries: [{ key: { content: 'A', layout: { width: 'content' } }, value: 'B' }],
      }).success,
    ).toBe(false);
  });

  it('保持单元格样式稀疏，直到角色和整体继承', () => {
    const source = {
      namespace: 'standard',
      type: 'map',
      entries: [{ key: { content }, value: { content, style: { fill: 'none' } } }],
      defaultCell: { style: { opacity: { fill: 0 } } },
    };
    const parsed = MapSchema.parse(JSON.parse(JSON.stringify(source)));

    expect(parsed.entries?.[0].key).not.toHaveProperty('style');
    expect(parsed.defaultCell?.style?.opacity).toEqual({ fill: 0 });
    expect(parsed.entries?.[0].value).toMatchObject({ style: { fill: 'none' } });
  });

  it('允许重复显示键和空结构', () => {
    expect(
      MapSchema.parse({
        namespace: 'standard',
        type: 'map',
        entries: Array.from({ length: 2 }, () => ({ key: { content }, value: { content } })),
      }).entries,
    ).toHaveLength(2);
    expect(ArraySchema.parse({ namespace: 'standard', type: 'array', items: [] }).items).toEqual([]);
  });

  it('将重复的身份指向有问题的单元格', () => {
    const parsed = MapSchema.safeParse({
      namespace: 'standard',
      type: 'map',
      entries: [{ key: { id: 'same', content }, value: { id: 'same', content } }],
    });

    expect(parsed.success).toBe(false);

    if (!parsed.success) expect(parsed.error.issues[0].path).toEqual(['entries', 0, 'value', 'id']);
  });

  it.each([
    { layout: { gap: -1 } },
    { layout: { gap: Infinity } },
    { defaultCell: { layout: { width: -2 } } },
    { defaultCell: { layout: { height: Infinity } } },
    { items: [{ content, layout: { height: -1 } }] },
    { index: { start: 0.5 } },
    { showIndex: true },
    { indexStart: 1 },
    { index: { start: -1 } },
    { index: { position: 'top' } },
    { index: { style: { fill: 'red' } } },
    { index: { style: { opacity: 2 } } },
    { style: { gap: 2 } },
    { style: { zIndex: 1 } },
    { items: [{ content, layout: { gap: 2 } }] },
    { items: [{ content, layout: { padding: -1 } }] },
  ])('拒绝无效源字段 %j', fields => {
    expect(ArraySchema.safeParse({ namespace: 'standard', type: 'array', items: [], ...fields }).success).toBe(false);
  });
});

it('保留 JSON 文本单元格（包括空文本），并且需要 Map 角色', () => {
  expect(ArraySchema.parse({ namespace: 'standard', type: 'array', items: [{ content: '' }] }).items).toEqual([
    { content: '' },
  ]);
  expect(
    MapSchema.parse({
      namespace: 'standard',
      type: 'map',
      entries: [{ key: 'a', value: { id: 'value', content: 'b' } }],
    }).entries,
  ).toEqual([{ key: 'a', value: { id: 'value', content: 'b' } }]);
  expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [{ value: 'b' }] }).success).toBe(false);
});

it('通过 JSON 解析保留稀疏分组的 Map 角色覆盖', () => {
  const defaultCell = {
    style: { opacity: { fill: 0 } },
    layout: { width: 80 },
    key: { style: { fill: 'blue' }, layout: { width: 'auto' } },
    value: { style: { fill: 'none' }, layout: { height: 0 } },
  };
  const parsed = MapSchema.parse(
    JSON.parse(
      JSON.stringify({ namespace: 'standard', type: 'map', entries: [{ key: 'a', value: 'b' }], defaultCell }),
    ),
  );
  expect(parsed.defaultCell).toEqual(defaultCell);
  expect(parsed.layout).toBeUndefined();
});
it.each([
  { defaultCell: { key: { style: { gap: 1 } } } },
  { defaultCell: { value: { style: { key: { fill: 'red' } } } } },
  { defaultCell: { key: { layout: { width: -1 } } } },
  { defaultCell: { value: { layout: { gap: 2 } } } },
])('拒绝无效的分组 Map 角色字段 %j', fields => {
  expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [], ...fields }).success).toBe(false);
});
