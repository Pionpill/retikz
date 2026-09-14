import type { IRNode } from '@retikz/core';

import { describe, expect, it } from 'vitest';
import { toJSONSchema } from 'zod';

import { createSurface, SurfaceSchema } from '../../../src';
import { resolveSurface } from '../../../src/resolve/surface';
import { fullScopeProps } from '../presentation/scope-props';

const node: IRNode = {
  type: 'node',
  position: [0, 0],
  layout: { minimumSize: { width: 20, height: 10 } },
};

const surface = (overrides: Record<string, unknown> = {}) => ({
  namespace: 'standard' as const,
  type: 'surface' as const,
  child: node,
  ...overrides,
});

describe('SurfaceSchema', () => {
  it('exports static shell defaults without traversing unrelated child contracts', () => {
    expect(toJSONSchema(SurfaceSchema.pick({ padding: true, overflow: true, cornerRadius: true }))).toMatchObject({
      properties: { padding: { default: 0 }, overflow: { default: 'visible' }, cornerRadius: { default: 0 } },
    });
  });
  it('materializes static defaults without inventing appearance', () => {
    const source = SurfaceSchema.parse(surface());
    expect(source).toEqual({ ...surface(), padding: 0, overflow: 'visible', cornerRadius: 0 });
    const parsed = resolveSurface(source);

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

  it('preserves padding shorthand until domain resolution', () => {
    expect(resolveSurface(SurfaceSchema.parse(surface({ padding: 6 }))).padding).toEqual({
      top: 6,
      right: 6,
      bottom: 6,
      left: 6,
    });
    expect(
      resolveSurface(SurfaceSchema.parse(surface({ padding: { default: 2, x: 4, y: 6, left: 8, top: 10 } }))).padding,
    ).toEqual({
      top: 10,
      right: 4,
      bottom: 6,
      left: 8,
    });
  });

  it('round-trips a defaulted snapshot without expanding shorthand', () => {
    const source = SurfaceSchema.parse(surface({ padding: { x: 4, top: 6 } }));
    expect(source.padding).toEqual({ x: 4, top: 6 });
    expect(source.overflow).toBe('visible');
    expect(SurfaceSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(source);
    expect(resolveSurface(source).padding).toEqual({ top: 6, right: 4, bottom: 0, left: 4 });
  });

  it('accepts any one Core or Tier-2 child and round-trips Source JSON', () => {
    const tier2 = SurfaceSchema.parse(
      surface({
        child: { namespace: 'third', type: 'card', id: 'card-a', data: { value: 3 } },
      }),
    );

    expect(tier2.child).toEqual({ namespace: 'third', type: 'card', id: 'card-a', data: { value: 3 } });
    expect(SurfaceSchema.parse(JSON.parse(JSON.stringify(tier2)))).toEqual(tier2);
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

  it('creates sparse Surface IR through the public factory', () => {
    expect(createSurface(surface({ padding: 3 }))).toEqual(surface({ padding: 3 }));
    expect(resolveSurface(createSurface(surface({ padding: 3 })))).toEqual(
      resolveSurface(SurfaceSchema.parse(surface({ padding: 3 }))),
    );
  });
});
