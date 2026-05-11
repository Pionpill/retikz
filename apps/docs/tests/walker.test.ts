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
