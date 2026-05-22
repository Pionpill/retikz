import { describe, expect, it } from 'vitest';
import { BUILTIN_SHAPES, localToWorld, worldToLocal } from '../../src/shapes';
import type { ShapeDefinition, ShapeStyle } from '../../src/shapes';
import type { Rect } from '../../src/geometry/rect';
import type { ScenePrimitive } from '../../src/primitive';

const SQRT2 = Math.SQRT2;
const id = (n: number): number => n;

describe('BUILTIN_SHAPES.circumscribe matches legacy layoutNode switch', () => {
  it('rectangle is identity', () => {
    expect(BUILTIN_SHAPES.rectangle.circumscribe(10, 6)).toEqual({ halfWidth: 10, halfHeight: 6 });
  });
  it('circle = √(hw²+hh²) on both axes', () => {
    const r = Math.sqrt(10 * 10 + 6 * 6);
    expect(BUILTIN_SHAPES.circle.circumscribe(10, 6)).toEqual({ halfWidth: r, halfHeight: r });
  });
  it('ellipse = inner × √2', () => {
    expect(BUILTIN_SHAPES.ellipse.circumscribe(10, 6)).toEqual({ halfWidth: 10 * SQRT2, halfHeight: 6 * SQRT2 });
  });
  it('diamond = inner × 2', () => {
    expect(BUILTIN_SHAPES.diamond.circumscribe(10, 6)).toEqual({ halfWidth: 20, halfHeight: 12 });
  });
});

describe('BUILTIN_SHAPES.anchor returns the 9 RECT_ANCHORS, undefined otherwise', () => {
  const rect: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };
  it('rectangle named anchors', () => {
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'center')).toEqual([0, 0]);
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'north')).toEqual([0, -5]);
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'east')).toEqual([10, 0]);
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'south-west')).toEqual([-10, 5]);
  });
  it('unknown anchor name → undefined (caller throws clear error)', () => {
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'foobar')).toBeUndefined();
    expect(BUILTIN_SHAPES.circle.anchor(rect, 'middle')).toBeUndefined();
    expect(BUILTIN_SHAPES.diamond.anchor(rect, '')).toBeUndefined();
  });
});

describe('boundaryPoint honours rect.rotate (rotate-bearing rect)', () => {
  it('rectangle rotated 90° clips toward +x at the rotated short half-axis', () => {
    const rect: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: Math.PI / 2 };
    const [px, py] = BUILTIN_SHAPES.rectangle.boundaryPoint(rect, [100, 0]);
    expect(px).toBeCloseTo(5, 6);
    expect(py).toBeCloseTo(0, 6);
  });
});

describe('emit runs in axis-aligned space and returns Iterable<ScenePrimitive>', () => {
  const rect: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };
  const style: ShapeStyle = { fill: 'red', stroke: 'blue', strokeWidth: 2 };
  it('rectangle → single RectPrim', () => {
    const prims = [...BUILTIN_SHAPES.rectangle.emit(rect, style, id)];
    expect(prims).toHaveLength(1);
    expect(prims[0].type).toBe('rect');
  });
  it('circle.emit delegates to ellipse.emit → EllipsePrim with rx === ry', () => {
    const square: Rect = { x: 0, y: 0, width: 20, height: 20, rotate: 0 };
    const prims = [...BUILTIN_SHAPES.circle.emit(square, style, id)];
    expect(prims[0].type).toBe('ellipse');
    if (prims[0].type === 'ellipse') expect(prims[0].rx).toBe(prims[0].ry);
  });
  it('diamond → PathPrim with 4 vertices + close', () => {
    const prims = [...BUILTIN_SHAPES.diamond.emit(rect, style, id)];
    expect(prims[0].type).toBe('path');
    if (prims[0].type === 'path') {
      expect(prims[0].commands.map(c => c.kind)).toEqual(['move', 'line', 'line', 'line', 'close']);
    }
  });
});

describe('custom ShapeDefinition is a plain object (factory-friendly)', () => {
  const createPolygonShape = (): ShapeDefinition => ({
    circumscribe: (hw, hh) => {
      const r = Math.sqrt(hw * hw + hh * hh);
      return { halfWidth: r, halfHeight: r };
    },
    boundaryPoint: (rect, toward) => {
      const [lx, ly] = worldToLocal(rect, toward);
      const len = Math.hypot(lx, ly) || 1;
      const r = rect.width / 2;
      return localToWorld(rect, [(lx / len) * r, (ly / len) * r]);
    },
    anchor: (rect, name) => (name === 'center' ? [rect.x, rect.y] : undefined),
    *emit (rect, style): Iterable<ScenePrimitive> {
      yield {
        type: 'path',
        commands: [{ kind: 'move', to: [rect.x, rect.y] }, { kind: 'close' }],
        fill: style.fill ?? 'transparent',
        stroke: style.stroke ?? 'currentColor',
        strokeWidth: style.strokeWidth ?? 1,
      };
    },
  });

  it('a returned plain object satisfies ShapeDefinition', () => {
    const poly = createPolygonShape();
    expect(poly.circumscribe(3, 4)).toEqual({ halfWidth: 5, halfHeight: 5 });
    expect(poly.anchor({ x: 0, y: 0, width: 10, height: 10 }, 'center')).toEqual([0, 0]);
    expect(poly.anchor({ x: 0, y: 0, width: 10, height: 10 }, 'north')).toBeUndefined();
    const prims = [...poly.emit({ x: 0, y: 0, width: 10, height: 10 }, {}, id)];
    expect(prims).toHaveLength(1);
  });
});
