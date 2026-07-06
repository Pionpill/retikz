import { describe, expect, it } from 'vitest';

import type { ResolveBoundaryContext } from '../../src/compile/node';
import type { Rect } from '../../src/shared/geometry/rect';

import { boundaryKey, resolveBoundary } from '../../src/compile/node';
import { ellipseShape, rectangle } from '../../src/providers/shape';

const visualRect: Rect = { x: 0, y: 0, width: 40, height: 20, rotate: 0 };
const registry = [rectangle, ellipseShape];

const resolveContext = (
  overrides: Partial<ResolveBoundaryContext> = {},
): ResolveBoundaryContext => ({
  visualDef: rectangle,
  visualRect,
  visualParams: {},
  shapeRegistry: registry,
  ...overrides,
});

describe('resolveBoundary', () => {
  it("'shape' / undefined → visual def + rect", () => {
    const r = resolveBoundary('shape', resolveContext());
    expect(r.def).toBe(rectangle);
    expect(r.rect).toEqual(visualRect);
    expect(resolveBoundary(undefined, resolveContext()).def).toBe(rectangle);
  });
  it("'rectangle' / 'ellipse' → builtin boundary providers on visual AABB", () => {
    expect(resolveBoundary('rectangle', resolveContext({ visualDef: ellipseShape })).def.name).toBe('rectangle');
    expect(resolveBoundary('ellipse', resolveContext()).def.name).toBe('ellipse');
  });
  it("'circle' → circle boundary provider uses squared-to-max geometry", () => {
    const r = resolveBoundary('circle', resolveContext());
    expect(r.def.name).toBe('circle');
    expect(r.def.boundaryPoint(r.rect, [0, -100], r.params)).toEqual([0, -20]);
    expect(r.rect.width).toBe(40);
    expect(r.rect.height).toBe(20);
    expect(r.rect.x).toBe(0);
  });
  it('builtin {type, params} → boundary provider + parsed params', () => {
    const r = resolveBoundary({ type: 'ellipse' }, resolveContext());
    expect(r.def.name).toBe('ellipse');
  });
  it('boundary provider beats registered same-name shape fallback', () => {
    const fakeCircle = { ...ellipseShape, name: 'circle' };
    const r = resolveBoundary('circle', resolveContext({ shapeRegistry: [...registry, fakeCircle] }));
    expect(r.def.name).toBe('circle');
    expect(r.def.boundaryPoint(r.rect, [0, -100], r.params)).toEqual([0, -20]);
  });
});

describe('boundaryKey', () => {
  it('stable per boundary', () => {
    expect(boundaryKey('shape')).toBe(boundaryKey('shape'));
    expect(boundaryKey('circle')).not.toBe(boundaryKey('shape'));
    expect(boundaryKey({ type: 'star', params: { points: 5 } })).toContain('star');
  });
});
