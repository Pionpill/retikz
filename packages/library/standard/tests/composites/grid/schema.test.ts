import { describe, expect, it } from 'vitest';

import { GridSchema } from '../../../src';

const base = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'standard' as const,
  type: 'grid' as const,
  bounds: { start: [0, 0], end: [120, 80] },
  spacing: 10,
  ...overrides,
});

describe('GridSchema', () => {
  it('uses both line directions by default', () => {
    const result = GridSchema.safeParse(base());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bounds).toEqual({ start: [0, 0], end: [120, 80] });
      expect(result.data.lines).toEqual({ vertical: true, horizontal: true, includeBoundary: false });
    }
  });

  it('parses spacing, lines, major, and border styles as separate strict objects', () => {
    const result = GridSchema.safeParse(
      base({
        spacing: { x: 10, y: 20 },
        lines: { style: { stroke: '#cbd5e1', strokeWidth: 0.5 } },
        major: { every: 5, style: { strokeWidth: 1.5 } },
        border: { padding: 4, style: { stroke: '#64748b', fill: '#fff' } },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.spacing).toEqual({ x: 10, y: 20 });
      expect(result.data.lines.style).toEqual({ stroke: '#cbd5e1', strokeWidth: 0.5 });
      expect(result.data.major?.style).toEqual({ strokeWidth: 1.5 });
      expect(result.data.border?.style).toEqual({ stroke: '#64748b', fill: '#fff' });
    }
  });

  it('parses absolute and center-local lattice origins', () => {
    const result = GridSchema.safeParse(base({ origin: [0, 5], lines: { includeBoundary: true } }));
    const centered = GridSchema.safeParse(
      base({ bounds: { position: [100, 60], width: 80, height: 40 }, origin: [0, 0] }),
    );

    expect(result.success).toBe(true);
    expect(centered.success).toBe(true);
  });

  it('accepts reversed and equal Cartesian corners without ordering validation', () => {
    expect(GridSchema.safeParse(base({ bounds: { start: [20, 10], end: [0, 0] } })).success).toBe(true);
    expect(GridSchema.safeParse(base({ bounds: { start: [0, 0], end: [0, 10] } })).success).toBe(true);
    expect(GridSchema.safeParse(base({ bounds: { start: [20, 10], end: [0, 10] } })).success).toBe(true);
  });

  it('parses center-plus-size bounds with Cartesian and PolarPosition centers', () => {
    const centered = GridSchema.safeParse(base({ bounds: { position: [100, 60], width: 80, height: 40 } }));
    const polar = GridSchema.safeParse(
      base({ bounds: { position: { origin: 'anchor', angle: 0, radius: 30 }, width: 80, height: 40 } }),
    );

    expect(centered.success).toBe(true);
    expect(polar.success).toBe(true);
  });

  it('accepts zero-sized center dimensions as degenerate bounds', () => {
    expect(GridSchema.safeParse(base({ bounds: { position: [10, 5], width: 0, height: 10 } })).success).toBe(true);
    expect(GridSchema.safeParse(base({ bounds: { position: [10, 5], width: 20, height: 0 } })).success).toBe(true);
  });

  it('rejects PolarPosition corners, obsolete fields, and negative dimensions', () => {
    const polarCorner = GridSchema.safeParse(
      base({ bounds: { start: { origin: [0, 0], angle: 0, radius: 10 }, end: [10, 10] } }),
    );
    const obsoleteBounds = GridSchema.safeParse(base({ bounds: { min: [0, 0], max: [10, 10] } }));
    const obsoleteLine = GridSchema.safeParse(base({ line: { spacing: 10 } }));
    const negativeDimension = GridSchema.safeParse(base({ bounds: { position: [0, 0], width: -1, height: 10 } }));

    expect(polarCorner.success).toBe(false);
    expect(obsoleteBounds.success).toBe(false);
    expect(obsoleteLine.success).toBe(false);
    expect(negativeDimension.success).toBe(false);
  });

  it('rejects disabling both line directions', () => {
    const result = GridSchema.safeParse(base({ lines: { vertical: false, horizontal: false } }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some(issue => issue.path[0] === 'lines')).toBe(true);
  });

  it('preserves recursive PolarPosition center input without resolving it in Standard', () => {
    const result = GridSchema.safeParse(
      base({
        bounds: {
          position: { origin: { origin: [10, 5], angle: 90, radius: 10 }, angle: 0, radius: 20 },
          width: 80,
          height: 40,
        },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bounds).toEqual({
        position: { origin: { origin: [10, 5], angle: 90, radius: 10 }, angle: 0, radius: 20 },
        width: 80,
        height: 40,
      });
    }
  });

  it('rejects unknown nested style fields at their input path', () => {
    const unknownStyle = GridSchema.safeParse(base({ lines: { style: { strokeWidth: 1, unsupported: true } } }));

    expect(unknownStyle.success).toBe(false);
    if (!unknownStyle.success) expect(unknownStyle.error.issues[0]?.path).toEqual(['lines', 'style']);
  });

  it('rejects lattice configurations that exceed the bounded lowering size for both bounds forms', () => {
    const corner = GridSchema.safeParse(base({ bounds: { start: [0, 0], end: [1, 1] }, spacing: 0.000001 }));
    const center = GridSchema.safeParse(base({ bounds: { position: [0, 0], width: 1, height: 1 }, spacing: 0.000001 }));

    expect(corner.success).toBe(false);
    expect(center.success).toBe(false);
    if (!corner.success) expect(corner.error.issues[0]?.path).toEqual(['spacing']);
    if (!center.success) expect(center.error.issues[0]?.path).toEqual(['spacing']);
  });

  it('reports bounded lattice errors at the independent direction path', () => {
    const result = GridSchema.safeParse(base({ spacing: { x: 0.000001, y: 10 } }));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['spacing', 'x']);
  });
});
