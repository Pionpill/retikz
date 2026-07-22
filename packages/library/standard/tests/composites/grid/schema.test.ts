import { describe, expect, it } from 'vitest';

import { GridSchema } from '../../../src';

describe('GridSchema', () => {
  it('parses a uniform grid with default line visibility', () => {
    const result = GridSchema.safeParse({
      namespace: 'standard',
      type: 'grid',
      bounds: { min: [0, 0], max: [120, 80] },
      spacing: 10,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lines).toEqual({ vertical: true, horizontal: true, includeBoundary: false });
    }
  });

  it('parses line, major, and border styles as separate strict objects', () => {
    const result = GridSchema.safeParse({
      namespace: 'standard',
      type: 'grid',
      bounds: { min: [0, 0], max: [120, 80] },
      spacing: { x: 10, y: 20 },
      lines: { style: { stroke: '#cbd5e1', strokeWidth: 0.5 } },
      major: { every: 5, style: { strokeWidth: 1.5 } },
      border: { padding: 4, style: { stroke: '#64748b', fill: '#fff' } },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.major?.style).toEqual({ strokeWidth: 1.5 });
      expect(result.data.border?.style).toEqual({ stroke: '#64748b', fill: '#fff' });
    }
  });

  it('rejects invalid bounds, disabled directions, and unknown nested style fields at their input path', () => {
    const invalidBounds = GridSchema.safeParse({
      namespace: 'standard',
      type: 'grid',
      bounds: { min: [1, 0], max: [1, 10] },
      spacing: 10,
    });
    const disabledLines = GridSchema.safeParse({
      namespace: 'standard',
      type: 'grid',
      bounds: { min: [0, 0], max: [10, 10] },
      spacing: 10,
      lines: { vertical: false, horizontal: false },
    });
    const unknownStyle = GridSchema.safeParse({
      namespace: 'standard',
      type: 'grid',
      bounds: { min: [0, 0], max: [10, 10] },
      spacing: 10,
      lines: { style: { strokeWidth: 1, unsupported: true } },
    });

    expect(invalidBounds.success).toBe(false);
    expect(disabledLines.success).toBe(false);
    expect(unknownStyle.success).toBe(false);
    if (!unknownStyle.success) {
      expect(unknownStyle.error.issues[0].path).toEqual(['lines', 'style']);
    }
  });

  it('rejects lattice configurations that exceed the bounded lowering size', () => {
    const result = GridSchema.safeParse({
      namespace: 'standard',
      type: 'grid',
      bounds: { min: [0, 0], max: [1, 1] },
      spacing: 0.000001,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['spacing']);
  });
});
