import { describe, expect, it } from 'vitest';

import { FontSchema, NodeSchema } from '../../src/schemas';

describe('FontSchema.size', () => {
  it('accepts web presets and relative units', () => {
    for (const size of ['sm', 'lg', '2xl', '1.25rem', '0.5em']) {
      expect(FontSchema.safeParse({ size }).success).toBe(true);
    }
  });

  it('round-trips font size strings through node schema', () => {
    const node = NodeSchema.parse({
      type: 'node',
      position: [0, 0],
      text: 'A',
      font: { size: 'sm' },
    });

    expect(NodeSchema.parse(JSON.parse(JSON.stringify(node)))).toEqual(node);
  });

  it('rejects unknown presets and unsupported CSS units', () => {
    for (const size of ['small', 'Large', 'medium', '12px', '80%', 'calc(1rem + 2px)']) {
      expect(FontSchema.safeParse({ size }).success).toBe(false);
    }
  });

  it('rejects non-positive relative units', () => {
    for (const size of ['0rem', '-1em']) {
      expect(FontSchema.safeParse({ size }).success).toBe(false);
    }
  });
});
