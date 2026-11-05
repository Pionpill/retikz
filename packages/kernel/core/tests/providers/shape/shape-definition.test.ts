import type { CenteredBox } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import type { CompiledShapeStyle, PathCommand } from '../../../src/contract';
import { BUILTIN_SHAPES } from '../../../src/providers/shape';

const SQRT2 = Math.SQRT2;

const id = (n: number): number => n;

/** 无参形状（rectangle）忽略 params；调用点传空对象满足新签名 */
const NO_PARAMS = {} as const;

/** circle 是内置 shape preset；compile 解析后由 ellipse + 此 params 提供几何 */
const EQUAL_PARAMS = { circumscribe: 'equal' } as const;

/** diamond 是内置 shape preset；compile 解析后由 polygon + 此 params 提供几何 */
const DIAMOND_PARAMS = { sides: 4, rotate: 0 } as const;

describe('内置形状的外接尺寸', () => {
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

describe('内置形状的边界点能力', () => {
  const r: CenteredBox = { x: 0, y: 0, width: 20, height: 10, rotate: 0 };

  it('rectangle.edgePoint 委托 rect 几何（top 上边中点）', () => {
    expect(BUILTIN_SHAPES.get('rectangle')!.computeEdgePoint!(r, 'top', 0.5, NO_PARAMS)).toEqual([0, -5]);
  });

  it('circle (= ellipse equal) edgePoint（外接框 20×20 → radius 10，right t=0.5）', () => {
    const square: CenteredBox = { x: 0, y: 0, width: 20, height: 20, rotate: 0 };
    const p = BUILTIN_SHAPES.get('ellipse')!.computeEdgePoint!(square, 'right', 0.5, EQUAL_PARAMS);

    expect(p[0]).toBeCloseTo(10, 6);
    expect(p[1]).toBeCloseTo(0, 6);
  });

  it('ellipse.edgePoint 将外接框半轴映射到右侧中点', () => {
    const point = BUILTIN_SHAPES.get('ellipse')!.computeEdgePoint!(r, 'right', 0.5, NO_PARAMS);
    expect(point[0]).toBeCloseTo(10, 6);
    expect(point[1]).toBeCloseTo(0, 6);
  });

  it('polygon（diamond preset）不实现 edgePoint（正多边形无 named side 语义）', () => {
    expect(BUILTIN_SHAPES.get('polygon')!.computeEdgePoint).toBeUndefined();
  });
});
