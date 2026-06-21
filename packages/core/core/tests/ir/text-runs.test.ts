import { describe, expect, it } from 'vitest';
import { LineSpecSchema, MathRunSchema, MixedLineSchema, NodeSchema, TextRunSchema } from '../../src/ir';

describe('[text-runs] run schemas', () => {
  it('accepts a text run with per-run style', () => {
    expect(TextRunSchema.safeParse({ text: 'E=', fill: '#f00', opacity: 0.8 }).success).toBe(true);
  });

  it('accepts a math run with tex / displayMode / fill', () => {
    expect(MathRunSchema.safeParse({ tex: 'mc^2', displayMode: true, fill: '#00f' }).success).toBe(true);
  });

  it('rejects a run carrying both text and tex (strict)', () => {
    expect(TextRunSchema.safeParse({ text: 'x', tex: 'y' }).success).toBe(false);
    expect(MathRunSchema.safeParse({ tex: 'y', text: 'x' }).success).toBe(false);
  });

  it('accepts a mixed line of text + math runs', () => {
    expect(
      MixedLineSchema.safeParse({ runs: [{ text: 'when ' }, { tex: 'v=d/t' }] }).success,
    ).toBe(true);
  });

  it('rejects an empty runs array', () => {
    expect(MixedLineSchema.safeParse({ runs: [] }).success).toBe(false);
  });

  it('admits a mixed line as a LineSpec', () => {
    expect(LineSpecSchema.safeParse({ runs: [{ tex: 'x' }] }).success).toBe(true);
  });

  it('round-trips a node whose text is an explicit run sequence', () => {
    const node = NodeSchema.parse({
      type: 'node',
      id: 'eq',
      position: [0, 0],
      text: [{ runs: [{ text: 'E=', opacity: 0.9 }, { tex: 'mc^2', displayMode: false }] }],
    });
    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });
});
