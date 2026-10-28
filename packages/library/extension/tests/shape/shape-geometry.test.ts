import type { PathPrimitive, ShapeDefinition } from '@retikz/core';
import type { JsonObject } from '@retikz/foundation';
import type { CenteredBox } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import {
  cylinderShapeDefinition,
  ellipticCapsuleShapeDefinition,
  hexagonShapeDefinition,
  parallelogramShapeDefinition,
  trapezoidShapeDefinition,
} from '../../src/node-shape';

const identity = (value: number): number => value;

const pathOf = (definition: ShapeDefinition, rect: CenteredBox, params: JsonObject): PathPrimitive => {
  const primitive = [...definition.emit(rect, {}, identity, params)][0];
  if (primitive.type !== 'path') throw new Error(`Expected '${definition.name}' to emit one path`);
  return primitive;
};

describe('扩展容器形状几何形状', () => {
  it('从选定的短边外接并发射梯形', () => {
    expect(trapezoidShapeDefinition.computeCircumscribedGeometry(36, 20, {})).toEqual({
      halfWidth: 50,
      halfHeight: 20,
    });
    expect(pathOf(trapezoidShapeDefinition, { x: 0, y: 0, width: 100, height: 40 }, {}).commands).toEqual([
      { kind: 'move', to: [-36, -20] },
      { kind: 'line', to: [36, -20] },
      { kind: 'line', to: [50, 20] },
      { kind: 'line', to: [-50, 20] },
      { kind: 'close' },
    ]);

    const rightParams = { shortSide: 'right', shortSideRatio: 0.5 } as const;

    expect(trapezoidShapeDefinition.computeCircumscribedGeometry(20, 10, rightParams)).toEqual({
      halfWidth: 20,
      halfHeight: 20,
    });
    expect(pathOf(trapezoidShapeDefinition, { x: 0, y: 0, width: 40, height: 40 }, rightParams).commands).toEqual([
      { kind: 'move', to: [-20, -20] },
      { kind: 'line', to: [20, -10] },
      { kind: 'line', to: [20, 10] },
      { kind: 'line', to: [-20, 20] },
      { kind: 'close' },
    ]);
    expect(
      trapezoidShapeDefinition.computeCircumscribedGeometry(20, 10, { shortSide: 'bottom', shortSideRatio: 0.5 }),
    ).toEqual({
      halfWidth: 40,
      halfHeight: 10,
    });
    expect(
      trapezoidShapeDefinition.computeCircumscribedGeometry(20, 10, { shortSide: 'left', shortSideRatio: 0.5 }),
    ).toEqual({
      halfWidth: 20,
      halfHeight: 20,
    });
    expect(trapezoidShapeDefinition.computeCircumscribedGeometry(20, 10, { shortSideRatio: 1 })).toEqual({
      halfWidth: 20,
      halfHeight: 10,
    });
  });

  it('镜像平行四边形倾斜方向并退化 90 度为矩形', () => {
    const right = { slantAngle: 45, slantDirection: 'right' } as const;
    const left = { slantAngle: 45, slantDirection: 'left' } as const;

    expect(parallelogramShapeDefinition.computeCircumscribedGeometry(20, 10, right)).toEqual({
      halfWidth: 40,
      halfHeight: 10,
    });
    expect(pathOf(parallelogramShapeDefinition, { x: 0, y: 0, width: 80, height: 20 }, right).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      { kind: 'line', to: [40, -10] },
      { kind: 'line', to: [20, 10] },
      { kind: 'line', to: [-40, 10] },
      { kind: 'close' },
    ]);
    expect(pathOf(parallelogramShapeDefinition, { x: 0, y: 0, width: 80, height: 20 }, left).commands).toEqual([
      { kind: 'move', to: [-40, -10] },
      { kind: 'line', to: [20, -10] },
      { kind: 'line', to: [40, 10] },
      { kind: 'line', to: [-20, 10] },
      { kind: 'close' },
    ]);
    expect(parallelogramShapeDefinition.computeCircumscribedGeometry(20, 10, { slantAngle: 90 })).toEqual({
      halfWidth: 20,
      halfHeight: 10,
    });
  });

  it('使用独立于细长六边形宽度的固定 12 单位肩部深度', () => {
    expect(hexagonShapeDefinition.computeCircumscribedGeometry(20, 10, {})).toEqual({
      halfWidth: 32,
      halfHeight: 10,
    });
    expect(hexagonShapeDefinition.computeCircumscribedGeometry(20, 10, { shoulderDepth: 8 })).toEqual({
      halfWidth: 28,
      halfHeight: 10,
    });
    expect(pathOf(hexagonShapeDefinition, { x: 0, y: 0, width: 120, height: 20 }, {}).commands).toEqual([
      { kind: 'move', to: [-48, -10] },
      { kind: 'line', to: [48, -10] },
      { kind: 'line', to: [60, 0] },
      { kind: 'line', to: [48, 10] },
      { kind: 'line', to: [-48, 10] },
      { kind: 'line', to: [-60, 0] },
      { kind: 'close' },
    ]);
    expect(
      pathOf(hexagonShapeDefinition, { x: 0, y: 0, width: 20, height: 20 }, { shoulderDepth: 16 }).commands,
    ).toEqual([
      { kind: 'move', to: [0, -10] },
      { kind: 'line', to: [0, -10] },
      { kind: 'line', to: [10, 0] },
      { kind: 'line', to: [0, 10] },
      { kind: 'line', to: [0, 10] },
      { kind: 'line', to: [-10, 0] },
      { kind: 'close' },
    ]);
  });

  it('发射一个垂直圆柱体作为一个外部轮廓加上一个盖子分隔子路径', () => {
    expect(cylinderShapeDefinition.computeCircumscribedGeometry(20, 10, {})).toEqual({ halfWidth: 20, halfHeight: 18 });
    expect(pathOf(cylinderShapeDefinition, { x: 0, y: 0, width: 40, height: 36 }, {}).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      { kind: 'ellipseArc', center: [0, -10], radiusX: 20, radiusY: 8, startAngle: 180, endAngle: 360 },
      { kind: 'line', to: [20, 10] },
      { kind: 'ellipseArc', center: [0, 10], radiusX: 20, radiusY: 8, startAngle: 0, endAngle: 180 },
      { kind: 'close' },
      { kind: 'move', to: [20, -10] },
      {
        kind: 'ellipseArc',
        center: [0, -10],
        radiusX: 20,
        radiusY: 8,
        startAngle: 0,
        endAngle: 180,
      },
    ]);
  });

  it('将圆柱体几何形状转置为水平轴并仅夹紧发射的盖深度', () => {
    const params = { axis: 'horizontal', capDepth: 8 } as const;

    expect(cylinderShapeDefinition.computeCircumscribedGeometry(20, 10, params)).toEqual({
      halfWidth: 28,
      halfHeight: 10,
    });
    expect(pathOf(cylinderShapeDefinition, { x: 0, y: 0, width: 56, height: 20 }, params).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      {
        kind: 'ellipseArc',
        center: [-20, 0],
        radiusX: 8,
        radiusY: 10,
        startAngle: 270,
        endAngle: 90,
        counterClockwise: true,
      },
      { kind: 'line', to: [20, 10] },
      {
        kind: 'ellipseArc',
        center: [20, 0],
        radiusX: 8,
        radiusY: 10,
        startAngle: 90,
        endAngle: -90,
        counterClockwise: true,
      },
      { kind: 'close' },
      { kind: 'move', to: [-20, 10] },
      {
        kind: 'ellipseArc',
        center: [-20, 0],
        radiusX: 8,
        radiusY: 10,
        startAngle: 90,
        endAngle: 270,
        counterClockwise: true,
      },
    ]);

    const clamped = pathOf(
      cylinderShapeDefinition,
      { x: 0, y: 0, width: 10, height: 20 },
      { axis: 'horizontal', capDepth: 20 },
    );

    expect(clamped.commands[0]).toEqual({ kind: 'move', to: [0, -10] });
    expect(clamped.commands[1]).toMatchObject({ center: [0, 0], radiusX: 5, radiusY: 10 });
  });

  it('发射垂直椭圆形胶囊作为一个封闭的外部轮廓，没有盖子分隔器', () => {
    expect(ellipticCapsuleShapeDefinition.computeCircumscribedGeometry(20, 10, {})).toEqual({
      halfWidth: 20,
      halfHeight: 18,
    });
    expect(pathOf(ellipticCapsuleShapeDefinition, { x: 0, y: 0, width: 40, height: 36 }, {}).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      { kind: 'ellipseArc', center: [0, -10], radiusX: 20, radiusY: 8, startAngle: 180, endAngle: 360 },
      { kind: 'line', to: [20, 10] },
      { kind: 'ellipseArc', center: [0, 10], radiusX: 20, radiusY: 8, startAngle: 0, endAngle: 180 },
      { kind: 'close' },
    ]);
  });

  it('转置椭圆胶囊并将零帽深度退化为矩形', () => {
    const horizontal = { axis: 'horizontal', capDepth: 8 } as const;

    expect(ellipticCapsuleShapeDefinition.computeCircumscribedGeometry(20, 10, horizontal)).toEqual({
      halfWidth: 28,
      halfHeight: 10,
    });
    expect(pathOf(ellipticCapsuleShapeDefinition, { x: 0, y: 0, width: 56, height: 20 }, horizontal).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      {
        kind: 'ellipseArc',
        center: [-20, 0],
        radiusX: 8,
        radiusY: 10,
        startAngle: 270,
        endAngle: 90,
        counterClockwise: true,
      },
      { kind: 'line', to: [20, 10] },
      {
        kind: 'ellipseArc',
        center: [20, 0],
        radiusX: 8,
        radiusY: 10,
        startAngle: 90,
        endAngle: -90,
        counterClockwise: true,
      },
      { kind: 'close' },
    ]);
    expect(
      pathOf(ellipticCapsuleShapeDefinition, { x: 0, y: 0, width: 40, height: 36 }, { capDepth: 0 }).commands,
    ).toEqual([
      { kind: 'move', to: [-20, -18] },
      { kind: 'line', to: [20, -18] },
      { kind: 'line', to: [20, 18] },
      { kind: 'line', to: [-20, 18] },
      { kind: 'close' },
    ]);
  });

  it('扩展圆角多边形形状，直到其内容角保留在最终轮廓内', () => {
    const sharp = trapezoidShapeDefinition.computeCircumscribedGeometry(36, 20, {});
    const roundedParams = { cornerRadius: 10 };
    const rounded = trapezoidShapeDefinition.computeCircumscribedGeometry(36, 20, roundedParams);

    expect(rounded.halfWidth).toBeGreaterThan(sharp.halfWidth);
    expect(rounded.halfHeight).toBeGreaterThan(sharp.halfHeight);

    const rect: CenteredBox = { x: 0, y: 0, width: rounded.halfWidth * 2, height: rounded.halfHeight * 2 };

    for (const corner of [
      [-36, -20],
      [36, -20],
      [36, 20],
      [-36, 20],
    ] as const) {
      const hit = trapezoidShapeDefinition.computeBoundaryPoint(rect, [corner[0], corner[1]], roundedParams);

      expect(Math.hypot(...hit)).toBeGreaterThanOrEqual(Math.hypot(corner[0], corner[1]) - 1e-6);
    }
  });

  it('使用最终轮廓作为方向边界点', () => {
    expect(trapezoidShapeDefinition.computeBoundaryPoint({ x: 0, y: 0, width: 100, height: 40 }, [100, 0], {})).toEqual(
      [43, 0],
    );
    expect(
      parallelogramShapeDefinition.computeBoundaryPoint({ x: 0, y: 0, width: 80, height: 20 }, [100, 0], {
        slantAngle: 45,
        slantDirection: 'right',
      }),
    ).toEqual([30, 0]);
    expect(hexagonShapeDefinition.computeBoundaryPoint({ x: 0, y: 0, width: 80, height: 20 }, [100, 0], {})).toEqual([
      40, 0,
    ]);
    expect(cylinderShapeDefinition.computeBoundaryPoint({ x: 0, y: 0, width: 40, height: 36 }, [0, -100], {})).toEqual([
      0, -18,
    ]);
    expect(
      ellipticCapsuleShapeDefinition.computeBoundaryPoint({ x: 0, y: 0, width: 40, height: 36 }, [0, -100], {}),
    ).toEqual([0, -18]);
    expect(
      trapezoidShapeDefinition.computeConnectionEnvelope?.({ x: 0, y: 0, width: 100, height: 40 }, 'rectangle', {}),
    ).toEqual({ halfWidth: 50, halfHeight: 20 });
    expect(
      cylinderShapeDefinition.computeConnectionEnvelope?.({ x: 0, y: 0, width: 40, height: 36 }, 'rectangle', {}),
    ).toEqual({ halfWidth: 20, halfHeight: 18 });
    expect(
      cylinderShapeDefinition.computeBoundaryPoint({ x: 0, y: 0, width: 40, height: 36 }, [0, -100], { capDepth: 0 }),
    ).toEqual([0, -18]);

    const rotated = cylinderShapeDefinition.computeBoundaryPoint(
      { x: 0, y: 0, width: 40, height: 36, rotate: Math.PI / 2 },
      [100, 0],
      {},
    );

    expect(rotated[0]).toBeCloseTo(18);
    expect(rotated[1]).toBeCloseTo(0);
  });

  it('仅缩放编写的用户单位长度', () => {
    expect(
      trapezoidShapeDefinition.scaleParams?.({ shortSide: 'left', shortSideRatio: 0.6, cornerRadius: 4 }, 4, 9),
    ).toEqual({ shortSide: 'left', shortSideRatio: 0.6, cornerRadius: 24 });
    expect(
      parallelogramShapeDefinition.scaleParams?.({ slantDirection: 'right', slantAngle: 70, cornerRadius: 4 }, 4, 9),
    ).toEqual({ slantDirection: 'right', slantAngle: 70, cornerRadius: 24 });
    expect(hexagonShapeDefinition.scaleParams?.({ shoulderDepth: 4, cornerRadius: 4 }, 4, 9)).toEqual({
      shoulderDepth: 24,
      cornerRadius: 24,
    });
    expect(cylinderShapeDefinition.scaleParams?.({ axis: 'horizontal', capDepth: 4 }, 4, 9)).toEqual({
      axis: 'horizontal',
      capDepth: 24,
    });
    expect(ellipticCapsuleShapeDefinition.scaleParams?.({ axis: 'horizontal', capDepth: 4 }, 4, 9)).toEqual({
      axis: 'horizontal',
      capDepth: 24,
    });
  });

  it('拒绝无效参数和非有限导出几何', () => {
    expect(() => trapezoidShapeDefinition.paramsSchema.parse({ shortSideRatio: 0 })).toThrow();
    expect(() => hexagonShapeDefinition.paramsSchema.parse({ shoulderDepth: -1 })).toThrow();
    expect(() => hexagonShapeDefinition.paramsSchema.parse({ shoulderRatio: 0.2 })).toThrow();
    expect(() => parallelogramShapeDefinition.paramsSchema.parse({ slantAngle: 0 })).toThrow();
    expect(() => cylinderShapeDefinition.paramsSchema.parse({ capDepth: -1 })).toThrow();
    expect(() => ellipticCapsuleShapeDefinition.paramsSchema.parse({ capDepth: -1 })).toThrow();
    expect(() => ellipticCapsuleShapeDefinition.paramsSchema.parse({ capDepth: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => ellipticCapsuleShapeDefinition.paramsSchema.parse({ unknown: true })).toThrow();
    expect(() => trapezoidShapeDefinition.paramsSchema.parse({ unknown: true })).toThrow();
    expect(() =>
      trapezoidShapeDefinition.computeCircumscribedGeometry(10, 10, { shortSideRatio: Number.MIN_VALUE }),
    ).toThrowError(expect.objectContaining({ code: 'EXTENSION_GEOMETRY_INVALID' }));
    expect(() =>
      parallelogramShapeDefinition.computeCircumscribedGeometry(10, 10, { slantAngle: Number.MIN_VALUE }),
    ).toThrowError(expect.objectContaining({ code: 'EXTENSION_GEOMETRY_INVALID' }));
  });
});
