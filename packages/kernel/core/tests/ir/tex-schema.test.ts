import { describe, expect, it } from 'vitest';

import { TexContentSchema } from '../../src/schemas/tex';

describe('[tex-schema] TexContentSchema (lowerTex payload)', () => {
  it('accepts a tex source', () => {
    expect(TexContentSchema.safeParse({ tex: '\\frac{a}{b}' }).success).toBe(true);
  });

  it('accepts displayMode', () => {
    const result = TexContentSchema.safeParse({ tex: 'E=mc^2', displayMode: true });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ tex: 'E=mc^2', displayMode: true });
  });

  it('allows empty source for compile-time degradation', () => {
    expect(TexContentSchema.safeParse({ tex: '' }).success).toBe(true);
  });

  it('rejects missing tex', () => {
    expect(TexContentSchema.safeParse({ displayMode: false }).success).toBe(false);
  });

  it('rejects non-string tex', () => {
    expect(TexContentSchema.safeParse({ tex: 123 }).success).toBe(false);
  });

  it('rejects non-boolean displayMode', () => {
    expect(TexContentSchema.safeParse({ tex: 'x', displayMode: 'yes' }).success).toBe(false);
  });
});
