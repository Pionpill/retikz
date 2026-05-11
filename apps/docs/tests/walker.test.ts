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
