import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { walkType } from '@/components/shared/zod-schema/walker';

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

  it('walks z.discriminatedUnion same as union', () => {
    const A = z.object({ type: z.literal('a'), x: z.number() });
    const B = z.object({ type: z.literal('b'), y: z.string() });
    const r = walkType(z.discriminatedUnion('type', [A, B]));
    expect(r.kind).toBe('union');
    if (r.kind === 'union') expect(r.members).toHaveLength(2);
  });

  it('resolves union members to ref when registered', async () => {
    // 用 IR 真实 schema 验证：CoordinateSchema.position 是 union of Position / PolarPosition / AtPosition，三者均注册
    const { CoordinateSchema } = await import('@retikz/core');
    const positionField = CoordinateSchema.shape.position;
    const r = walkType(positionField);
    expect(r.kind).toBe('union');
    if (r.kind === 'union') {
      const labels = r.members.map(m => (m.kind === 'ref' ? m.name : `<${m.kind}>`));
      expect(labels).toEqual(['Position', 'PolarPosition', 'AtPosition']);
    }
  });
});
