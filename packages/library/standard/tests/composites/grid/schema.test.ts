import { describe, expect, it } from 'vitest';

import { GridSchema } from '../../../src';
import { fullScopeProps } from '../presentation/scope-props';

const base = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'standard' as const,
  type: 'grid' as const,
  bounds: { start: [0, 0], end: [120, 80] },
  ...overrides,
});

describe('GridSchema', () => {
  it('reuses the complete Core Scope authored surface', () => {
    const parsed = GridSchema.parse({
      namespace: 'standard',
      type: 'grid',
      ...fullScopeProps,
      bounds: { start: [0, 0], end: [20, 10] },
    });

    expect(parsed).toMatchObject(fullScopeProps);
    expect(GridSchema.parse(JSON.parse(JSON.stringify(parsed)))).toEqual(parsed);
  });

  it('uses both line directions with default spacing when line is omitted', () => {
    const result = GridSchema.safeParse(base());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bounds).toEqual({ start: [0, 0], end: [120, 80] });
      expect(result.data.line).toBe(true);
    }
  });

  it('parses a shared line object with spacing, origin, major, and border styles', () => {
    const result = GridSchema.safeParse(
      base({
        line: {
          spacing: 10,
          origin: 5,
          includeBoundary: true,
          style: { stroke: '#cbd5e1', strokeWidth: 0.5 },
          major: { every: 5, style: { strokeWidth: 1.5 } },
        },
        border: { padding: 4, style: { stroke: '#64748b', fill: '#fff' } },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.line).toEqual({
        spacing: 10,
        origin: 5,
        includeBoundary: true,
        style: { stroke: '#cbd5e1', strokeWidth: 0.5 },
        major: { every: 5, offset: 0, style: { strokeWidth: 1.5 } },
      });
      expect(result.data.border?.style).toEqual({ stroke: '#64748b', fill: '#fff' });
    }
  });

  it('parses independent vertical and horizontal line configurations', () => {
    const result = GridSchema.safeParse(
      base({
        line: {
          vertical: { spacing: 10, origin: 0, style: { stroke: '#ef4444' } },
          horizontal: { spacing: 20, origin: 5, style: { stroke: '#3b82f6' } },
        },
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.line).toEqual({
        vertical: { spacing: 10, origin: 0, includeBoundary: false, style: { stroke: '#ef4444' } },
        horizontal: { spacing: 20, origin: 5, includeBoundary: false, style: { stroke: '#3b82f6' } },
      });
    }
  });

  it('accepts line false while preserving an independent border', () => {
    const result = GridSchema.safeParse(base({ line: false, border: { padding: 4, style: { stroke: '#64748b' } } }));

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.line).toBe(false);
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

  it('rejects PolarPosition corners, obsolete top-level line fields, and negative dimensions', () => {
    const polarCorner = GridSchema.safeParse(
      base({ bounds: { start: { origin: [0, 0], angle: 0, radius: 10 }, end: [10, 10] } }),
    );
    const obsoleteBounds = GridSchema.safeParse(base({ bounds: { min: [0, 0], max: [10, 10] } }));
    const obsoleteFields = [
      { spacing: 10 },
      { origin: [0, 5] },
      { lines: { style: { stroke: '#cbd5e1' } } },
      { major: { every: 2 } },
    ].map(fields => GridSchema.safeParse(base(fields)));
    const negativeDimension = GridSchema.safeParse(base({ bounds: { position: [0, 0], width: -1, height: 10 } }));

    expect(polarCorner.success).toBe(false);
    expect(obsoleteBounds.success).toBe(false);
    expect(obsoleteFields.every(result => !result.success)).toBe(true);
    expect(negativeDimension.success).toBe(false);
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
    const unknownStyle = GridSchema.safeParse(base({ line: { style: { strokeWidth: 1, unsupported: true } } }));

    expect(unknownStyle.success).toBe(false);
    if (!unknownStyle.success) {
      const issue = unknownStyle.error.issues[0];
      expect(issue.code).toBe('invalid_union');
      if (issue.code === 'invalid_union') {
        expect(issue.errors[1]?.[0]?.path).toEqual(['style']);
      }
    }
  });

  it('rejects lattice configurations that exceed the bounded lowering size for both bounds forms', () => {
    const corner = GridSchema.safeParse(base({ bounds: { start: [0, 0], end: [1, 1] }, line: { spacing: 0.000001 } }));
    const center = GridSchema.safeParse(
      base({ bounds: { position: [0, 0], width: 1, height: 1 }, line: { spacing: 0.000001 } }),
    );

    expect(corner.success).toBe(false);
    expect(center.success).toBe(false);
    if (!corner.success) expect(corner.error.issues[0]?.path).toEqual(['line', 'spacing']);
    if (!center.success) expect(center.error.issues[0]?.path).toEqual(['line', 'spacing']);
  });

  it('reports bounded lattice errors at the independent direction path', () => {
    const result = GridSchema.safeParse(
      base({ line: { vertical: { spacing: 0.000001 }, horizontal: { spacing: 10 } } }),
    );

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.path).toEqual(['line', 'vertical', 'spacing']);
  });
});
