import { describe, expect, it } from 'vitest';
import { resolveConnectSurface, surfaceKey } from '../../src/compile/connectSurface';
import { ellipse, rectangle } from '../../src/shapes';
import type { Rect } from '../../src/geometry/rect';

const visualRect: Rect = { x: 0, y: 0, width: 40, height: 20, rotate: 0 };
const registry = { rectangle, ellipse };

describe('resolveConnectSurface', () => {
  it("'shape' / undefined → visual def + rect", () => {
    const r = resolveConnectSurface('shape', rectangle, visualRect, {}, registry);
    expect(r.def).toBe(rectangle);
    expect(r.rect).toEqual(visualRect);
    expect(resolveConnectSurface(undefined, rectangle, visualRect, {}, registry).def).toBe(rectangle);
  });
  it("'rectangle' / 'ellipse' → that builtin def on visual AABB", () => {
    expect(resolveConnectSurface('rectangle', ellipse, visualRect, {}, registry).def).toBe(rectangle);
    expect(resolveConnectSurface('ellipse', rectangle, visualRect, {}, registry).def).toBe(ellipse);
  });
  it("'circle' → ellipse def on squared-to-max rect", () => {
    const r = resolveConnectSurface('circle', rectangle, visualRect, {}, registry);
    expect(r.def).toBe(ellipse);
    expect(r.rect.width).toBe(40);
    expect(r.rect.height).toBe(40);
    expect(r.rect.x).toBe(0);
  });
  it('borrowed {type, params} → registry def + parsed params', () => {
    const r = resolveConnectSurface({ type: 'ellipse' }, rectangle, visualRect, {}, registry);
    expect(r.def).toBe(ellipse);
  });
  it('reserved keyword beats registered same-name shape', () => {
    const fakeCircle = { ...ellipse };
    const r = resolveConnectSurface('circle', rectangle, visualRect, {}, { ...registry, circle: fakeCircle });
    expect(r.def).toBe(ellipse);
    expect(r.rect.height).toBe(40);
  });
});

describe('surfaceKey', () => {
  it('stable per surface', () => {
    expect(surfaceKey('shape')).toBe(surfaceKey('shape'));
    expect(surfaceKey('circle')).not.toBe(surfaceKey('shape'));
    expect(surfaceKey({ type: 'star', params: { points: 5 } })).toContain('star');
  });
});
