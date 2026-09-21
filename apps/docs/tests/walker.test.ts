import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { walk, walkType } from '@/modules/docs/components';

describe('walker — primitives & literal', () => {
  it('walks z.string() to primitive', () => {
    expect(walkType(z.string())).toEqual({ kind: 'primitive', name: 'string' });
  });

  it('walks z.number() to primitive', () => {
    expect(walkType(z.number())).toEqual({ kind: 'primitive', name: 'number' });
  });

  it('walks z.boolean() to primitive', () => {
    expect(walkType(z.boolean())).toEqual({ kind: 'primitive', name: 'boolean' });
  });

  it('walks z.null() to a null literal', () => {
    expect(walkType(z.null())).toEqual({ kind: 'literal', value: null });
  });

  it('walks z.literal("coordinate") to literal', () => {
    expect(walkType(z.literal('coordinate'))).toEqual({ kind: 'literal', value: 'coordinate' });
  });

  it('walks z.literal(1) to literal', () => {
    expect(walkType(z.literal(1))).toEqual({ kind: 'literal', value: 1 });
  });
});

describe('walker — enum / nativeEnum / array', () => {
  it('walks z.enum to enum repr', () => {
    expect(walkType(z.enum(['a', 'b', 'c']))).toEqual({
      kind: 'enum',
      values: ['a', 'b', 'c'],
    });
  });

  it('walks z.nativeEnum to enum repr', () => {
    const E = { Red: 'red', Blue: 'blue' } as const;
    const r = walkType(z.nativeEnum(E));
    expect(r.kind).toBe('enum');
    if (r.kind === 'enum') expect(new Set(r.values)).toEqual(new Set(['red', 'blue']));
  });

  it('walks z.array of primitive', () => {
    expect(walkType(z.array(z.number()))).toEqual({
      kind: 'array',
      element: { kind: 'primitive', name: 'number' },
      constraints: [],
    });
  });

  it('walks z.array with .min(2) constraint', () => {
    const r = walkType(z.array(z.string()).min(2));
    expect(r).toEqual({
      kind: 'array',
      element: { kind: 'primitive', name: 'string' },
      constraints: ['min 2'],
    });
  });
});

describe('walker — tuple / lazy / union / discriminatedUnion', () => {
  it('walks z.tuple to tuple repr', () => {
    expect(walkType(z.tuple([z.number(), z.number()]))).toEqual({
      kind: 'tuple',
      elements: [
        { kind: 'primitive', name: 'number' },
        { kind: 'primitive', name: 'number' },
      ],
    });
  });

  it('walks z.lazy by unwrapping the inner schema', () => {
    const Lazy = z.lazy(() => z.string());
    expect(walkType(Lazy)).toEqual({ kind: 'primitive', name: 'string' });
  });

  it('walks z.union members recursively', () => {
    const r = walkType(z.union([z.string(), z.number()]));
    expect(r).toEqual({
      kind: 'union',
      members: [
        { kind: 'primitive', name: 'string' },
        { kind: 'primitive', name: 'number' },
      ],
    });
  });

  it('preserves registered names within top-level unions', async () => {
    const { TransformSchema } = await import('@retikz/core');
    const r = walk(TransformSchema);

    expect(r.kind).toBe('alias');
    if (r.kind !== 'alias' || r.type.kind !== 'union') throw new Error('expected union alias');
    expect(r.type.members[0]).toMatchObject({
      kind: 'ref',
      name: 'TranslateSchema',
    });
  });

  it('walks intersections so custom clip branches retain both contracts', async () => {
    const { ClipSchema } = await import('@retikz/core');
    const r = walk(ClipSchema);

    expect(r.kind).toBe('alias');
    if (r.kind !== 'alias' || r.type.kind !== 'union') throw new Error('expected union alias');
    expect(r.type.members[1]).toMatchObject({
      kind: 'intersection',
      members: [
        { kind: 'object', fields: [{ name: 'kind' }] },
        { kind: 'ref', name: 'JsonObjectSchema' },
      ],
    });
  });

  it('walks z.discriminatedUnion same as union', () => {
    const A = z.object({ type: z.literal('a'), x: z.number() });
    const B = z.object({ type: z.literal('b'), y: z.string() });
    const r = walkType(z.discriminatedUnion('type', [A, B]));
    expect(r.kind).toBe('union');
    if (r.kind === 'union') expect(r.members).toHaveLength(2);
  });

  it('falls back to a transform pipe input when the output is opaque', () => {
    const schema = z
      .union([z.number(), z.strictObject({ row: z.number(), column: z.number() })])
      .transform(value => (typeof value === 'number' ? { row: value, column: value } : value));
    const r = walkType(schema);

    expect(r).toMatchObject({
      kind: 'union',
      members: [
        { kind: 'primitive', name: 'number' },
        { kind: 'object', fields: [{ name: 'row' }, { name: 'column' }] },
      ],
    });
  });

  it('resolves union members to ref when registered', async () => {
    // 用 IR 真实 schema 验证：CoordinateSchema.position 是 union of Position / PolarPosition / AtPosition / OffsetPosition / BetweenPosition，五者均注册
    const { CoordinateSchema } = await import('@retikz/core');
    const positionField = CoordinateSchema.shape.position;
    const r = walkType(positionField);
    expect(r.kind).toBe('union');
    if (r.kind === 'union') {
      const labels = r.members.map(m => (m.kind === 'ref' ? m.name : `<${m.kind}>`));
      expect(labels).toEqual([
        'PositionSchema',
        'PolarPositionSchema',
        'AtPositionSchema',
        'OffsetPositionSchema',
        'BetweenPositionSchema',
      ]);
    }
  });
});

describe('walker — top-level entry + object + optional + constraints', () => {
  it('walks top-level z.object to SchemaRepr kind=object', async () => {
    const { CoordinateSchema } = await import('@retikz/core');
    const r = walk(CoordinateSchema);
    expect(r.kind).toBe('object');
    if (r.kind === 'object') {
      expect(r.description).toMatch(/Coordinate placeholder/);
      const names = r.fields.map(f => f.name);
      expect(names).toEqual(['type', 'id', 'position']);
    }
  });

  it('top-level non-object emits SchemaRepr kind=alias', async () => {
    const { PositionSchema } = await import('@retikz/core');
    const r = walk(PositionSchema);
    expect(r.kind).toBe('alias');
    if (r.kind === 'alias') {
      expect(r.description).toMatch(/Cartesian/);
      expect(r.type.kind).toBe('tuple');
    }
  });

  it('marks optional fields', () => {
    const S = z.object({
      a: z.string(),
      b: z.string().optional(),
    });
    const r = walk(S);
    if (r.kind !== 'object') throw new Error('expected object');
    expect(r.fields[0].optional).toBe(false);
    expect(r.fields[1].optional).toBe(true);
  });

  it('extracts numeric constraints', () => {
    const S = z.object({
      ratio: z.number().min(0).max(1),
      size: z.number().positive(),
      pad: z.number().nonnegative(),
      tag: z.string().min(1),
    });
    const r = walk(S);
    if (r.kind !== 'object') throw new Error('expected object');
    const cmap = Object.fromEntries(r.fields.map(f => [f.name, f.constraints]));
    expect(cmap.ratio).toContain('0..1');
    expect(cmap.size).toContain('positive');
    expect(cmap.pad).toContain('nonnegative');
    expect(cmap.tag).toContain('min 1');
  });

  it('captures .describe() per field', async () => {
    const { CoordinateSchema } = await import('@retikz/core');
    const r = walk(CoordinateSchema);
    if (r.kind !== 'object') throw new Error('expected object');
    const idField = r.fields.find(f => f.name === 'id')!;
    expect(idField.description).toMatch(/Required unique id/);
  });

  it('inline-expands anonymous nested object', () => {
    const S = z.object({
      meta: z.object({
        x: z.number(),
        y: z.string(),
      }),
    });
    const r = walk(S);
    if (r.kind !== 'object') throw new Error('expected object');
    const meta = r.fields[0];
    expect(meta.type.kind).toBe('object');
    if (meta.type.kind === 'object') {
      expect(meta.type.fields.map(f => f.name)).toEqual(['x', 'y']);
    }
  });

  it('inline-expands anonymous object inside a union', () => {
    // 对应 LineSchema 那种"union 里夹一个匿名 object"
    const S = z.union([z.string(), z.object({ text: z.string(), color: z.string().optional() })]);
    const r = walkType(S);
    if (r.kind !== 'union') throw new Error('expected union');
    expect(r.members[0]).toEqual({ kind: 'primitive', name: 'string' });
    expect(r.members[1].kind).toBe('object');
    if (r.members[1].kind === 'object') {
      expect(r.members[1].fields.map(f => f.name)).toEqual(['text', 'color']);
    }
  });

  it('marks a loose object as allowing additional properties', () => {
    const r = walkType(z.looseObject({ kind: z.string() }));

    expect(r).toMatchObject({
      kind: 'object',
      additionalProperties: true,
    });
  });

  it('walks a top-level owner schema while preserving its description', async () => {
    const { ThemeSchema } = await import('@retikz/core');
    const r = walk(ThemeSchema);

    expect(r.kind).toBe('object');
    if (r.kind !== 'object') throw new Error('expected object');
    expect(r.description).toMatch(/Sparse Theme override/);
    expect(r.fields.map(field => field.name)).toEqual(['style', 'mode']);
  });

  it('prefers a field wrapper description over the referenced schema description', async () => {
    const { SceneSchema, ScopeSchema } = await import('@retikz/core');
    const scene = walk(SceneSchema);
    const scope = walk(ScopeSchema);

    if (scene.kind !== 'object' || scope.kind !== 'object') throw new Error('expected objects');
    expect(scene.fields.find(field => field.name === 'theme')?.description).toBe(SceneSchema.shape.theme.description);
    expect(scope.fields.find(field => field.name === 'theme')?.description).toBe(ScopeSchema.shape.theme.description);
  });
});

it('保留具名 union 子类型与共享节点几何名称', async () => {
  const { BoundarySchema, NodeSchema, NodeLayoutSchema } = await import('@retikz/core');
  expect(JSON.stringify(walk(BoundarySchema))).toContain('ShapeRefSchema');
  expect(JSON.stringify(walk(NodeSchema))).toContain('AxisScaleSchema');
  const layout = JSON.stringify(walk(NodeLayoutSchema));
  expect(layout).toContain('BoxSizeSchema');
  expect(layout).toContain('BoxSpacingSchema');
});

it('shows required and readonly fields plus forbidden union inputs accurately', () => {
  const schema = z
    .strictObject({
      data: z.array(z.string()).readonly().optional(),
      items: z.never().optional(),
    })
    .required({ data: true });
  const result = walk(schema);
  expect(result).toMatchObject({
    kind: 'object',
    fields: [
      { name: 'data', optional: false, type: { kind: 'array', element: { kind: 'primitive', name: 'string' } } },
      { name: 'items', optional: true, type: { kind: 'primitive', name: 'never' } },
    ],
  });
});
