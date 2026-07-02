import { describe, expect, it } from 'vitest';

import type { Rect } from '../../src/shared/geometry/rect';

import { boundaryKey, resolveBoundary } from '../../src/compile/boundary';
import { ellipseShape, rectangle } from '../../src/providers/shape';

const visualRect: Rect = { x: 0, y: 0, width: 40, height: 20, rotate: 0 };
const registry = [rectangle, ellipseShape];

describe('resolveBoundary', () => {
  it("'shape' / undefined → visual def + rect", () => {
    const r = resolveBoundary('shape', rectangle, visualRect, {}, registry);
    expect(r.def).toBe(rectangle);
    expect(r.rect).toEqual(visualRect);
    expect(resolveBoundary(undefined, rectangle, visualRect, {}, registry).def).toBe(rectangle);
  });
  it("'rectangle' / 'ellipse' → builtin boundary providers on visual AABB", () => {
    expect(resolveBoundary('rectangle', ellipseShape, visualRect, {}, registry).def.name).toBe('rectangle');
    expect(resolveBoundary('ellipse', rectangle, visualRect, {}, registry).def.name).toBe('ellipse');
  });
  it("'circle' → circle boundary provider uses squared-to-max geometry", () => {
    const r = resolveBoundary('circle', rectangle, visualRect, {}, registry);
    expect(r.def.name).toBe('circle');
    expect(r.def.boundaryPoint(r.rect, [0, -100], r.params)).toEqual([0, -20]);
    expect(r.rect.width).toBe(40);
    expect(r.rect.height).toBe(20);
    expect(r.rect.x).toBe(0);
  });
  it('builtin {type, params} → boundary provider + parsed params', () => {
    const r = resolveBoundary({ type: 'ellipse' }, rectangle, visualRect, {}, registry);
    expect(r.def.name).toBe('ellipse');
  });
  it('boundary provider beats registered same-name shape fallback', () => {
    const fakeCircle = { ...ellipseShape, name: 'circle' };
    const r = resolveBoundary('circle', rectangle, visualRect, {}, [...registry, fakeCircle]);
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
