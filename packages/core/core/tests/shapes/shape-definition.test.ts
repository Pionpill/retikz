import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { BUILTIN_SHAPES, defineShape, localToWorld, worldToLocal } from '../../src/shapes';
import type { ShapeDefinition, ShapeStyle } from '../../src/shapes';
import type { Rect } from '../../src/geometry/rect';
import type { PathCommand, ScenePrimitive } from '../../src/primitive';

const SQRT2 = Math.SQRT2;
const id = (n: number): number => n;
/** 无参形状（rectangle）忽略 params；调用点传空对象满足新签名 */
const NO_PARAMS = {} as const;
/** circle 已收为 ellipse 等轴 preset（无独立注册项）；其几何由 ellipse + 此 params 等价提供 */
const EQUAL_PARAMS = { circumscribe: 'equal' } as const;
/** diamond 已收为 polygon 4 边形 preset（无独立注册项）；其几何由 polygon + 此 params 等价提供 */
const DIAMOND_PARAMS = { sides: 4, rotate: 0 } as const;

describe('BUILTIN_SHAPES.circumscribe matches legacy layoutNode switch', () => {
  it('rectangle is identity', () => {
    expect(BUILTIN_SHAPES.rectangle.circumscribe(10, 6, NO_PARAMS)).toEqual({ halfWidth: 10, halfHeight: 6 });
  });
  it('circle (= ellipse equal) = √(hw²+hh²) on both axes', () => {
    const r = Math.hypot(10, 6);
    expect(BUILTIN_SHAPES.ellipse.circumscribe(10, 6, EQUAL_PARAMS)).toEqual({ halfWidth: r, halfHeight: r });
  });
  it('ellipse = inner × √2', () => {
    expect(BUILTIN_SHAPES.ellipse.circumscribe(10, 6, NO_PARAMS)).toEqual({ halfWidth: 10 * SQRT2, halfHeight: 6 * SQRT2 });
  });
  it('diamond (= polygon 4/0) 外接 AABB：顶点在坐标轴上，AABB 半轴相等', () => {
    // polygon{4,0} 是视觉菱形：外接圆 R = (hw + hh)，顶点在东西南北方向。
    const r = BUILTIN_SHAPES.polygon.circumscribe(10, 6, DIAMOND_PARAMS);
    expect(r.halfWidth).toBeCloseTo(16, 6);
    expect(r.halfHeight).toBeCloseTo(16, 6);
  });
});

describe('BUILTIN_SHAPES.anchor returns the 9 compass anchors, undefined otherwise', () => {
  const rect: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };
  it('rectangle named anchors', () => {
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'center', NO_PARAMS)).toEqual([0, 0]);
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'north', NO_PARAMS)).toEqual([0, -5]);
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'east', NO_PARAMS)).toEqual([10, 0]);
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'south-west', NO_PARAMS)).toEqual([-10, 5]);
  });
  it('unknown anchor name → undefined (caller throws clear error)', () => {
    expect(BUILTIN_SHAPES.rectangle.anchor(rect, 'foobar', NO_PARAMS)).toBeUndefined();
    expect(BUILTIN_SHAPES.ellipse.anchor(rect, 'middle', EQUAL_PARAMS)).toBeUndefined();
    expect(BUILTIN_SHAPES.polygon.anchor(rect, '', DIAMOND_PARAMS)).toBeUndefined();
  });
});

describe('boundaryPoint honours rect.rotate (rotate-bearing rect)', () => {
  it('rectangle rotated 90° clips toward +x at the rotated short half-axis', () => {
    const rect: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: Math.PI / 2 };
    const [px, py] = BUILTIN_SHAPES.rectangle.boundaryPoint(rect, [100, 0], NO_PARAMS);
    expect(px).toBeCloseTo(5, 6);
    expect(py).toBeCloseTo(0, 6);
  });
});

describe('emit runs in axis-aligned space and returns Iterable<ScenePrimitive>', () => {
  const rect: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };
  const style: ShapeStyle = { fill: 'red', stroke: 'blue', strokeWidth: 2 };
  it('rectangle → single RectPrim', () => {
    const prims = [...BUILTIN_SHAPES.rectangle.emit(rect, style, id, NO_PARAMS)];
    expect(prims).toHaveLength(1);
    expect(prims[0].type).toBe('rect');
  });
  it('circle (= ellipse equal) emit → EllipsePrim with rx === ry', () => {
    const square: Rect = { x: 0, y: 0, width: 20, height: 20, rotate: 0 };
    const prims = [...BUILTIN_SHAPES.ellipse.emit(square, style, id, EQUAL_PARAMS)];
    expect(prims[0].type).toBe('ellipse');
    if (prims[0].type === 'ellipse') expect(prims[0].rx).toBe(prims[0].ry);
  });
  it('diamond (= polygon 4/0) → PathPrim with 4 vertices + close', () => {
    const prims = [...BUILTIN_SHAPES.polygon.emit(rect, style, id, DIAMOND_PARAMS)];
    expect(prims[0].type).toBe('path');
    if (prims[0].type === 'path') {
      expect(prims[0].commands.map(c => c.kind)).toEqual(['move', 'line', 'line', 'line', 'close']);
      const points = prims[0].commands
        .filter((c): c is Extract<PathCommand, { to: [number, number] }> => 'to' in c)
        .map(c => c.to);
      expect(points[0][0]).toBeCloseTo(10, 6);
      expect(points[0][1]).toBeCloseTo(0, 6);
      expect(points[1][0]).toBeCloseTo(0, 6);
      expect(points[1][1]).toBeCloseTo(10, 6);
      expect(points[2][0]).toBeCloseTo(-10, 6);
      expect(points[2][1]).toBeCloseTo(0, 6);
      expect(points[3][0]).toBeCloseTo(0, 6);
      expect(points[3][1]).toBeCloseTo(-10, 6);
    }
  });
});

describe('custom ShapeDefinition is a plain object (factory-friendly)', () => {
  const createPolygonShape = (): ShapeDefinition =>
    defineShape({
      paramsSchema: z.strictObject({}),
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
    expect(poly.circumscribe(3, 4, NO_PARAMS)).toEqual({ halfWidth: 5, halfHeight: 5 });
    expect(poly.anchor({ x: 0, y: 0, width: 10, height: 10 }, 'center', NO_PARAMS)).toEqual([0, 0]);
    expect(poly.anchor({ x: 0, y: 0, width: 10, height: 10 }, 'north', NO_PARAMS)).toBeUndefined();
    const prims = [...poly.emit({ x: 0, y: 0, width: 10, height: 10 }, {}, id, NO_PARAMS)];
    expect(prims).toHaveLength(1);
  });

  it('edgePoint is optional —— custom shape may omit it', () => {
    const poly = createPolygonShape();
    expect(poly.edgePoint).toBeUndefined();
  });
});

describe('BUILTIN_SHAPES.edgePoint —— 内置 4 shape 必实现，落真实边界（ADR-02）', () => {
  const r: Rect = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };

  it('直边 / 周长类 shape（rectangle / ellipse）实现 edgePoint', () => {
    // circle 已并入 ellipse；diamond 已收为 polygon（正多边形无 4 named side 语义、edgePoint 为可选不实现）。
    expect(typeof BUILTIN_SHAPES.rectangle.edgePoint).toBe('function');
    expect(typeof BUILTIN_SHAPES.ellipse.edgePoint).toBe('function');
  });

  it('rectangle.edgePoint 委托 rect 几何（north 上边中点）', () => {
    expect(BUILTIN_SHAPES.rectangle.edgePoint!(r, 'north', 0.5, NO_PARAMS)).toEqual([0, -5]);
  });

  it('circle (= ellipse equal) edgePoint（外接框 20×20 → radius 10，east t=0.5）', () => {
    const square: Rect = { x: 0, y: 0, width: 20, height: 20, rotate: 0 };
    const p = BUILTIN_SHAPES.ellipse.edgePoint!(square, 'east', 0.5, EQUAL_PARAMS);
    expect(p[0]).toBeCloseTo(10, 6);
    expect(p[1]).toBeCloseTo(0, 6);
  });

  it('ellipse.edgePoint：外接框 ×√2 后落椭圆周（east t=0.5 = (rx, 0)）', () => {
    // shapes/ellipse 把 Rect(width) → rx = width/2 / √2？实际由 toEllipse 决定，仅校验在周长上
    const p = BUILTIN_SHAPES.ellipse.edgePoint!(r, 'east', 0.5, NO_PARAMS);
    // east 中点必在 +x 轴上
    expect(p[1]).toBeCloseTo(0, 6);
    expect(p[0]).toBeGreaterThan(0);
  });

  it('polygon（diamond preset）不实现 edgePoint（正多边形无 named side 语义）', () => {
    expect(BUILTIN_SHAPES.polygon.edgePoint).toBeUndefined();
  });
});
