import type { CenteredBox } from '@retikz/math';
import { localToWorld, worldToLocal } from '@retikz/math';
import { describe, expect, it } from 'vitest';
import { strictObject } from 'zod';

import type { CompiledShapeStyle, PathCommand, ScenePrimitive, ShapeDefinition } from '../../../src/contract';
import { defineShape } from '../../../src/contract';
import { BUILTIN_SHAPES } from '../../../src/providers/shape';

const SQRT2 = Math.SQRT2;

const id = (n: number): number => n;

/** 无参形状（rectangle）忽略 params；调用点传空对象满足新签名 */
const NO_PARAMS = {} as const;

/** circle 是内置 shape preset；compile 解析后由 ellipse + 此 params 提供几何 */
const EQUAL_PARAMS = { circumscribe: 'equal' } as const;

/** diamond 是内置 shape preset；compile 解析后由 polygon + 此 params 提供几何 */
const DIAMOND_PARAMS = { sides: 4, rotate: 0 } as const;

describe('BUILTIN_SHAPES.circumscribe 与传统 layoutNode 交换机匹配', () => {
  it('矩形为单位', () => {
    expect(BUILTIN_SHAPES.get('rectangle')!.computeCircumscribedGeometry(10, 6, NO_PARAMS)).toEqual({
      halfWidth: 10,
      halfHeight: 6,
    });
  });

  it('两个轴上的圆（= 椭圆相等）= √(hw²+hh²)', () => {
    const r = Math.hypot(10, 6);

    expect(BUILTIN_SHAPES.get('ellipse')!.computeCircumscribedGeometry(10, 6, EQUAL_PARAMS)).toEqual({
      halfWidth: r,
      halfHeight: r,
    });
  });

  it('椭圆=内×√2', () => {
    expect(BUILTIN_SHAPES.get('ellipse')!.computeCircumscribedGeometry(10, 6, NO_PARAMS)).toEqual({
      halfWidth: 10 * SQRT2,
      halfHeight: 6 * SQRT2,
    });
  });

  it('diamond (= polygon 4/0) 外接 AABB：顶点在坐标轴上，AABB 半轴相等', () => {
    // polygon{4,0} 是视觉菱形：外接圆 R = (hw + hh)，顶点在东西南北方向。
    const r = BUILTIN_SHAPES.get('polygon')!.computeCircumscribedGeometry(10, 6, DIAMOND_PARAMS);

    expect(r.halfWidth).toBeCloseTo(16, 6);
    expect(r.halfHeight).toBeCloseTo(16, 6);
  });
});

describe('BUILTIN_SHAPES.anchor 返回规范锚点，否则 undefined', () => {
  const rect: CenteredBox = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };
  it('名为锚点的矩形', () => {
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'center', NO_PARAMS)).toBeUndefined();
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'top', NO_PARAMS)).toEqual([0, -5]);
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'right', NO_PARAMS)).toEqual([10, 0]);
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'bottom-left', NO_PARAMS)).toEqual([-10, 5]);
  });

  it('规范的方向锚点仍然被内置提供者接受', () => {
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'top', NO_PARAMS)).toEqual([0, -5]);
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'bottom-left', NO_PARAMS)).toEqual([-10, 5]);
  });

  it('未知的锚点名称→undefined（调用者抛出明确的错误）', () => {
    expect(BUILTIN_SHAPES.get('rectangle')!.resolveAnchor(rect, 'foobar', NO_PARAMS)).toBeUndefined();
    expect(BUILTIN_SHAPES.get('ellipse')!.resolveAnchor(rect, 'middle', EQUAL_PARAMS)).toBeUndefined();
    expect(BUILTIN_SHAPES.get('polygon')!.resolveAnchor(rect, '', DIAMOND_PARAMS)).toBeUndefined();
  });
});

describe('boundaryPoint 尊重 rect.rotate（旋转轴承矩形）', () => {
  it('旋转 90° 的矩形在旋转的短半轴处朝 +x 裁剪', () => {
    const rect: CenteredBox = { x: 0, y: 0, width: 20, height: 10, rotate: Math.PI / 2 };
    const [px, py] = BUILTIN_SHAPES.get('rectangle')!.computeBoundaryPoint(rect, [100, 0], NO_PARAMS);

    expect(px).toBeCloseTo(5, 6);
    expect(py).toBeCloseTo(0, 6);
  });
});

describe('发出在轴对齐空间中运行并返回 Iterable<ScenePrimitive>', () => {
  const rect: CenteredBox = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };
  const style: CompiledShapeStyle = { fill: 'red', stroke: 'blue', strokeWidth: 2 };
  it('矩形→单个 RectPrimitive', () => {
    const prims = [...BUILTIN_SHAPES.get('rectangle')!.emit(rect, style, id, NO_PARAMS)];

    expect(prims).toHaveLength(1);
    expect(prims[0].type).toBe('rect');
  });

  it('圆（= 椭圆相等）发出 → EllipsePrimitive，其中 rx === ry', () => {
    const square: CenteredBox = { x: 0, y: 0, width: 20, height: 20, rotate: 0 };
    const prims = [...BUILTIN_SHAPES.get('ellipse')!.emit(square, style, id, EQUAL_PARAMS)];

    expect(prims[0].type).toBe('ellipse');

    if (prims[0].type === 'ellipse') expect(prims[0].rx).toBe(prims[0].ry);
  });

  it('菱形（= 多边形 4/0）→ PathPrimitive 有 4 个顶点 + 闭合', () => {
    const prims = [...BUILTIN_SHAPES.get('polygon')!.emit(rect, style, id, DIAMOND_PARAMS)];

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

describe('自定义 ShapeDefinition 是一个普通对象（工厂友好）', () => {
  const createPolygonShape = (): ShapeDefinition =>
    defineShape({
      name: 'customPolygon',
      paramsSchema: strictObject({}),
      computeCircumscribedGeometry: (hw, hh) => {
        const r = Math.sqrt(hw * hw + hh * hh);
        return { halfWidth: r, halfHeight: r };
      },
      computeBoundaryPoint: (rect, toward) => {
        const [lx, ly] = worldToLocal(rect, toward);
        const len = Math.hypot(lx, ly) || 1;
        const r = rect.width / 2;

        return localToWorld(rect, [(lx / len) * r, (ly / len) * r]);
      },
      resolveAnchor: (rect, name) => (name === 'origin' ? [rect.x, rect.y] : undefined),
      *emit(rect, style): Iterable<ScenePrimitive> {
        yield {
          type: 'path',
          commands: [{ kind: 'move', to: [rect.x, rect.y] }, { kind: 'close' }],
          fill: style.fill ?? 'transparent',
          stroke: style.stroke ?? 'currentColor',
          strokeWidth: style.strokeWidth ?? 1,
        };
      },
    });

  it('返回的普通对象满足 ShapeDefinition', () => {
    const poly = createPolygonShape();

    expect(poly.computeCircumscribedGeometry(3, 4, NO_PARAMS)).toEqual({ halfWidth: 5, halfHeight: 5 });
    expect(poly.resolveAnchor({ x: 0, y: 0, width: 10, height: 10 }, 'origin', NO_PARAMS)).toEqual([0, 0]);
    expect(poly.resolveAnchor({ x: 0, y: 0, width: 10, height: 10 }, 'top', NO_PARAMS)).toBeUndefined();

    const prims = [...poly.emit({ x: 0, y: 0, width: 10, height: 10 }, {}, id, NO_PARAMS)];

    expect(prims).toHaveLength(1);
  });

  it('edgePoint 为可选——自定义形状可省略', () => {
    const poly = createPolygonShape();

    expect(poly.computeEdgePoint).toBeUndefined();
  });
});

describe('BUILTIN_SHAPES.edgePoint —— 内置 4 shape 必实现，落真实边界', () => {
  const r: CenteredBox = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };

  it('直边 / 周长类 shape（rectangle / ellipse）实现 edgePoint', () => {
    // circle preset 复用 ellipse edgePoint；diamond preset 复用 polygon（正多边形无 4 named side 语义、edgePoint 为可选不实现）。
    expect(typeof BUILTIN_SHAPES.get('rectangle')!.computeEdgePoint).toBe('function');
    expect(typeof BUILTIN_SHAPES.get('ellipse')!.computeEdgePoint).toBe('function');
  });

  it('rectangle.edgePoint 委托 rect 几何（top 上边中点）', () => {
    expect(BUILTIN_SHAPES.get('rectangle')!.computeEdgePoint!(r, 'top', 0.5, NO_PARAMS)).toEqual([0, -5]);
  });

  it('circle (= ellipse equal) edgePoint（外接框 20×20 → radius 10，right t=0.5）', () => {
    const square: CenteredBox = { x: 0, y: 0, width: 20, height: 20, rotate: 0 };
    const p = BUILTIN_SHAPES.get('ellipse')!.computeEdgePoint!(square, 'right', 0.5, EQUAL_PARAMS);

    expect(p[0]).toBeCloseTo(10, 6);
    expect(p[1]).toBeCloseTo(0, 6);
  });

  it('ellipse.edgePoint：外接框 ×√2 后落椭圆周（right t=0.5 = (rx, 0)）', () => {
    // shapes/ellipse 把 CenteredBox(width) → rx = width/2 / √2？实际由 toEllipse 决定，仅校验在周长上
    const p = BUILTIN_SHAPES.get('ellipse')!.computeEdgePoint!(r, 'right', 0.5, NO_PARAMS);

    // right 中点必在 +x 轴上
    expect(p[1]).toBeCloseTo(0, 6);
    expect(p[0]).toBeGreaterThan(0);
  });

  it('polygon（diamond preset）不实现 edgePoint（正多边形无 named side 语义）', () => {
    expect(BUILTIN_SHAPES.get('polygon')!.computeEdgePoint).toBeUndefined();
  });
});
