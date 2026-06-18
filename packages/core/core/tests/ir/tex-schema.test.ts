import { describe, expect, it } from 'vitest';
import { NodeSchema } from '../../src/ir';
import { TexContentSchema } from '../../src/ir/tex';

describe('[tex-schema] TexContentSchema', () => {
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

describe('[tex-schema] IRNode.tex', () => {
  const baseNode = { type: 'node', id: 'eq', position: [0, 0] } as const;

  it('accepts tex content on a node', () => {
    expect(NodeSchema.safeParse({ ...baseNode, tex: { tex: '\\frac{a}{b}' } }).success).toBe(true);
  });

  it('allows text and tex at schema level', () => {
    expect(NodeSchema.safeParse({ ...baseNode, text: 'hi', tex: { tex: 'x' } }).success).toBe(true);
  });

  it('accepts tex content with a shape', () => {
    expect(NodeSchema.safeParse({ ...baseNode, shape: 'rectangle', tex: { tex: 'x^2' } }).success).toBe(true);
  });

  it('rejects invalid tex content on a strict node', () => {
    expect(NodeSchema.safeParse({ ...baseNode, tex: { displayMode: true } }).success).toBe(false);
  });

  it('round-trips through JSON', () => {
    const node = NodeSchema.parse({ ...baseNode, tex: { tex: 'a+b', displayMode: false } });
    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });
});
