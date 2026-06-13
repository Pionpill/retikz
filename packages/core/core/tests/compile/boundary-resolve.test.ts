import { describe, expect, it } from 'vitest';
import { boundaryKey, resolveBoundary } from '../../src/compile/boundary';
import { ellipse, rectangle } from '../../src/shapes';
import type { Rect } from '../../src/geometry/rect';

const visualRect: Rect = { x: 0, y: 0, width: 40, height: 20, rotate: 0 };
const registry = { rectangle, ellipse };

describe('resolveBoundary', () => {
  it("'shape' / undefined → visual def + rect", () => {
    const r = resolveBoundary('shape', rectangle, visualRect, {}, registry);
    expect(r.def).toBe(rectangle);
    expect(r.rect).toEqual(visualRect);
    expect(resolveBoundary(undefined, rectangle, visualRect, {}, registry).def).toBe(rectangle);
  });
  it("'rectangle' / 'ellipse' → that builtin def on visual AABB", () => {
    expect(resolveBoundary('rectangle', ellipse, visualRect, {}, registry).def).toBe(rectangle);
    expect(resolveBoundary('ellipse', rectangle, visualRect, {}, registry).def).toBe(ellipse);
  });
  it("'circle' → ellipse def on squared-to-max rect", () => {
    const r = resolveBoundary('circle', rectangle, visualRect, {}, registry);
    expect(r.def).toBe(ellipse);
    expect(r.rect.width).toBe(40);
    expect(r.rect.height).toBe(40);
    expect(r.rect.x).toBe(0);
  });
  it('borrowed {type, params} → registry def + parsed params', () => {
    const r = resolveBoundary({ type: 'ellipse' }, rectangle, visualRect, {}, registry);
    expect(r.def).toBe(ellipse);
  });
  it('reserved keyword beats registered same-name shape', () => {
    const fakeCircle = { ...ellipse };
    const r = resolveBoundary('circle', rectangle, visualRect, {}, { ...registry, circle: fakeCircle });
    expect(r.def).toBe(ellipse);
    expect(r.rect.height).toBe(40);
  });
});

describe('boundaryKey', () => {
  it('stable per boundary', () => {
    expect(boundaryKey('shape')).toBe(boundaryKey('shape'));
    expect(boundaryKey('circle')).not.toBe(boundaryKey('shape'));
    expect(boundaryKey({ type: 'star', params: { points: 5 } })).toContain('star');
  });
});
