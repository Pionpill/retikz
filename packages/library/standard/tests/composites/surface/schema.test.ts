import { describe, expect, it } from 'vitest';

import { createSurface, IRSurfaceSchema, SurfaceSchema } from '../../../src';
import { fullScopeProps } from '../presentation/scope-props';

const node = { type: 'node', position: [0, 0], minimumSize: { width: 20, height: 10 } } as const;

const surface = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'standard' as const,
  type: 'surface' as const,
  child: node,
  ...overrides,
});

describe('SurfaceSchema', () => {
  it('materializes canonical defaults without inventing appearance', () => {
    const parsed = SurfaceSchema.parse(surface());

    expect(parsed).toEqual({
      namespace: 'standard',
      type: 'surface',
      child: node,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      overflow: 'visible',
      cornerRadius: 0,
    });
    expect(parsed).not.toHaveProperty('background');
    expect(parsed).not.toHaveProperty('border');
  });

  it('normalizes scalar and CSS-like padding once at the schema boundary', () => {
    expect(SurfaceSchema.parse(surface({ padding: 6 })).padding).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 6,
    });
    expect(SurfaceSchema.parse(surface({ padding: { default: 2, x: 4, y: 6, left: 8, top: 10 } })).padding).toEqual({
      top: 10,
      right: 4,
      bottom: 6,
      left: 8,
    });
  });

  it('keeps canonical output padding strict and fully explicit', () => {
    const canonical = SurfaceSchema.parse(surface({ padding: { x: 4, top: 6 } }));

    expect(IRSurfaceSchema.parse(canonical)).toEqual(canonical);
    for (const padding of [
      4,
      {},
      { default: 2 },
      { top: 1, right: 1, bottom: 1 },
      {
        top: 1,
        right: 1,
        bottom: 1,
        left: 1,
        x: 1,
      },
    ]) {
      expect(IRSurfaceSchema.safeParse(surface({ padding, overflow: 'visible', cornerRadius: 0 })).success).toBe(false);
    }
  });

  it('accepts any one Core or Tier-2 child and round-trips canonical JSON', () => {
    const tier2 = SurfaceSchema.parse(
      surface({
        child: { namespace: 'third', type: 'card', id: 'card-a', data: { value: 3 } },
      }),
    );

    expect(tier2.child).toEqual({ namespace: 'third', type: 'card', id: 'card-a', data: { value: 3 } });
    expect(IRSurfaceSchema.parse(JSON.parse(JSON.stringify(tier2)))).toEqual(tier2);
  });

  it('reuses complete Scope props and closed paint/stroke appearance', () => {
    const parsed = SurfaceSchema.parse(
      surface({
        ...fullScopeProps,
        background: { fill: '#f8fafc', fillOpacity: 0.75 },
        border: { stroke: '#0f172a', strokeWidth: 2, strokeOpacity: 0.5 },
        cornerRadius: 8,
        overflow: 'clip',
      }),
    );

    expect(parsed).toMatchObject({
      ...fullScopeProps,
      background: { fill: '#f8fafc', fillOpacity: 0.75 },
      border: { stroke: '#0f172a', strokeWidth: 2, strokeOpacity: 0.5 },
      cornerRadius: 8,
      overflow: 'clip',
    });
  });

  it('rejects invalid appearance, spacing, overflow, and unknown fields at the public boundary', () => {
    const invalid = [
      surface({ padding: -1 }),
      surface({ cornerRadius: -1 }),
      surface({ overflow: 'scroll' }),
      surface({ background: { fillOpacity: 0.5 } }),
      surface({ background: { fill: '#fff', fillOpacity: 2 } }),
      surface({ border: { stroke: '#000', zIndex: 1 } }),
      surface({ border: { unsupported: true } }),
      surface({ unsupported: true }),
    ];

    expect(invalid.every(input => !SurfaceSchema.safeParse(input).success)).toBe(true);
  });

  it('creates canonical Surface IR through the public factory', () => {
    expect(createSurface(surface({ padding: 3 }))).toEqual(SurfaceSchema.parse(surface({ padding: 3 })));
  });
});
