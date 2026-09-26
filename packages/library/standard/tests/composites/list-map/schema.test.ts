import { describe, expect, it } from 'vitest';

import { ListSchema } from '../../../src/container/list/schema';
import { MapSchema } from '../../../src/container/map/schema';

const content = { type: 'node', position: [0, 0], text: 'a' };
it('parses index shorthand, object defaults, and JSON text styles', () => {
  const base = { namespace: 'standard', type: 'list', items: ['A'] };
  expect(ListSchema.parse(base).index).toBe(false);
  expect(ListSchema.parse({ ...base, index: true }).index).toBe(true);
  expect(ListSchema.parse({ ...base, index: {} }).index).toEqual({ position: 'before', start: 0 });
  const index = { position: 'after', start: 2, style: { font: { size: 24 }, textColor: 'red', opacity: 0 } };
  expect(ListSchema.parse(JSON.parse(JSON.stringify({ ...base, index }))).index).toEqual(index);
});
it('treats List strings as content by default and validates derived ids when enabled', () => {
  const base = { namespace: 'standard', type: 'list' };
  const items = ['A', 'A', '', '   ', { content: 'B', id: 'A' }];
  expect(ListSchema.parse({ ...base, items }).items).toEqual(items);
  expect(ListSchema.parse({ ...base, items }).cellIdMode).toBe('explicit');
  expect(ListSchema.parse({ ...base, items: ['A'], cellIdMode: 'string' }).cellIdMode).toBe('string');
  for (const invalidItems of [[''], ['   '], ['A', 'A'], ['A', { content: 'B', id: 'A' }]]) {
    expect(ListSchema.safeParse({ ...base, items: invalidItems, cellIdMode: 'string' }).success).toBe(false);
  }
  expect(ListSchema.parse({ ...base, items: [{ content: 'A' }, { content: 'A' }] }).items).toHaveLength(2);
  expect(
    ListSchema.safeParse({
      ...base,
      items: [
        { content: 'A', id: 'same' },
        { content: 'B', id: 'same' },
      ],
    }).success,
  ).toBe(false);
});
describe('List / Map Source contracts', () => {
  it('accepts a persisted data object display mode and rejects it on explicit cells', () => {
    const listSource = { namespace: 'standard', type: 'list', data: [{ a: 1 }] };
    const mapSource = { namespace: 'standard', type: 'map', data: { value: { a: 1 } } };
    expect(ListSchema.parse(listSource).dataObjectDisplay).toBe('map');
    expect(MapSchema.parse(mapSource).dataObjectDisplay).toBe('map');
    expect(
      ListSchema.parse(JSON.parse(JSON.stringify({ ...listSource, dataObjectDisplay: 'text' }))).dataObjectDisplay,
    ).toBe('text');
    expect(
      MapSchema.parse(JSON.parse(JSON.stringify({ ...mapSource, dataObjectDisplay: 'text' }))).dataObjectDisplay,
    ).toBe('text');
    expect(ListSchema.safeParse({ ...listSource, dataObjectDisplay: 'raw' }).success).toBe(false);
    expect(MapSchema.safeParse({ ...mapSource, dataObjectDisplay: 'raw' }).success).toBe(false);
    expect(
      ListSchema.safeParse({ namespace: 'standard', type: 'list', items: ['A'], dataObjectDisplay: 'text' }).success,
    ).toBe(false);
    expect(
      MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [], dataObjectDisplay: 'text' }).success,
    ).toBe(false);
  });
  it('accepts content width only for List overall and direct cells after JSON round-trip', () => {
    const source = {
      namespace: 'standard',
      type: 'list',
      layout: { width: 'content' },
      items: [{ content: 'A', layout: { width: 'content' } }],
    };
    const parsed = ListSchema.parse(JSON.parse(JSON.stringify(source)));
    expect(parsed.layout?.width).toBe('content');
    expect(parsed.items?.[0]).toMatchObject({ layout: { width: 'content' } });
    for (const layout of [{ width: 'content' }, { key: { width: 'content' } }, { value: { width: 'content' } }]) {
      expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [], layout }).success).toBe(false);
    }
    expect(
      MapSchema.safeParse({
        namespace: 'standard',
        type: 'map',
        entries: [{ key: { content: 'A', layout: { width: 'content' } }, value: 'B' }],
      }).success,
    ).toBe(false);
  });
  it('keeps cell styles sparse until role and overall inheritance', () => {
    const source = {
      namespace: 'standard',
      type: 'map',
      style: { fillOpacity: 0 },
      entries: [{ key: { content }, value: { content, style: { fill: 'none' } } }],
    };
    const parsed = MapSchema.parse(JSON.parse(JSON.stringify(source)));
    expect(parsed.entries?.[0].key).not.toHaveProperty('style');
    expect(parsed.style?.fillOpacity).toBe(0);
    expect(parsed.entries?.[0].value).toMatchObject({ style: { fill: 'none' } });
  });
  it('allows repeated display keys and empty structures', () => {
    expect(
      MapSchema.parse({
        namespace: 'standard',
        type: 'map',
        entries: Array.from({ length: 2 }, () => ({ key: { content }, value: { content } })),
      }).entries,
    ).toHaveLength(2);
    expect(ListSchema.parse({ namespace: 'standard', type: 'list', items: [] }).items).toEqual([]);
  });
  it('points duplicate identities at the offending cell', () => {
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
    { layout: { width: -2 } },
    { layout: { height: Infinity } },
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
  ])('rejects invalid source fields %j', fields => {
    expect(ListSchema.safeParse({ namespace: 'standard', type: 'list', items: [], ...fields }).success).toBe(false);
  });
});

it('preserves JSON text cells including empty text and requires both Map roles', () => {
  expect(ListSchema.parse({ namespace: 'standard', type: 'list', items: [{ content: '' }] }).items).toEqual([
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

it('preserves sparse grouped Map role overrides through JSON parsing', () => {
  const style = { fillOpacity: 0, key: { fill: 'blue' }, value: { fill: 'none' } };
  const layout = { width: 80, key: { width: 'auto' }, value: { height: 0 } };
  const parsed = MapSchema.parse(
    JSON.parse(
      JSON.stringify({
        namespace: 'standard',
        type: 'map',
        style,
        layout,
        entries: [{ key: 'a', value: 'b' }],
      }),
    ),
  );
  expect(parsed.style).toEqual(style);
  expect(parsed.layout).toMatchObject(layout);
  expect(parsed.layout?.key).toEqual({ width: 'auto' });
});
it.each([
  { style: { key: { gap: 1 } } },
  { style: { value: { key: { fill: 'red' } } } },
  { layout: { key: { width: -1 } } },
  { layout: { value: { gap: 2 } } },
])('rejects invalid grouped Map role fields %j', fields => {
  expect(MapSchema.safeParse({ namespace: 'standard', type: 'map', entries: [], ...fields }).success).toBe(false);
});
