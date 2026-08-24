import type { IRJsonObject, PathPrim, Rect, ShapeDefinition } from '@retikz/core';

import { describe, expect, it } from 'vitest';

import {
  CylinderShapeDefinition,
  EllipticCapsuleShapeDefinition,
  HexagonShapeDefinition,
  ParallelogramShapeDefinition,
  TrapezoidShapeDefinition,
} from '../../src/shape';

const identity = (value: number): number => value;

const pathOf = (definition: ShapeDefinition, rect: Rect, params: IRJsonObject): PathPrim => {
  const primitive = [...definition.emit(rect, {}, identity, params)][0];
  if (primitive.type !== 'path') throw new Error(`Expected '${definition.name}' to emit one path`);
  return primitive;
};

describe('Standard container shape geometry', () => {
  it('circumscribes and emits a trapezoid from the selected short side', () => {
    expect(TrapezoidShapeDefinition.circumscribe(36, 20, {})).toEqual({ halfWidth: 50, halfHeight: 20 });
    expect(pathOf(TrapezoidShapeDefinition, { x: 0, y: 0, width: 100, height: 40 }, {}).commands).toEqual([
      { kind: 'move', to: [-36, -20] },
      { kind: 'line', to: [36, -20] },
      { kind: 'line', to: [50, 20] },
      { kind: 'line', to: [-50, 20] },
      { kind: 'close' },
    ]);

    const rightParams = { shortSide: 'right', shortSideRatio: 0.5 } as const;
    expect(TrapezoidShapeDefinition.circumscribe(20, 10, rightParams)).toEqual({
      halfWidth: 20,
      halfHeight: 20,
    });
    expect(pathOf(TrapezoidShapeDefinition, { x: 0, y: 0, width: 40, height: 40 }, rightParams).commands).toEqual([
      { kind: 'move', to: [-20, -20] },
      { kind: 'line', to: [20, -10] },
      { kind: 'line', to: [20, 10] },
      { kind: 'line', to: [-20, 20] },
      { kind: 'close' },
    ]);
    expect(TrapezoidShapeDefinition.circumscribe(20, 10, { shortSide: 'bottom', shortSideRatio: 0.5 })).toEqual({
      halfWidth: 40,
      halfHeight: 10,
    });
    expect(TrapezoidShapeDefinition.circumscribe(20, 10, { shortSide: 'left', shortSideRatio: 0.5 })).toEqual({
      halfWidth: 20,
      halfHeight: 20,
    });
    expect(TrapezoidShapeDefinition.circumscribe(20, 10, { shortSideRatio: 1 })).toEqual({
      halfWidth: 20,
      halfHeight: 10,
    });
  });

  it('mirrors parallelogram slant direction and degenerates 90 degrees to a rectangle', () => {
    const right = { slantAngle: 45, slantDirection: 'right' } as const;
    const left = { slantAngle: 45, slantDirection: 'left' } as const;
    expect(ParallelogramShapeDefinition.circumscribe(20, 10, right)).toEqual({
      halfWidth: 40,
      halfHeight: 10,
    });
    expect(pathOf(ParallelogramShapeDefinition, { x: 0, y: 0, width: 80, height: 20 }, right).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      { kind: 'line', to: [40, -10] },
      { kind: 'line', to: [20, 10] },
      { kind: 'line', to: [-40, 10] },
      { kind: 'close' },
    ]);
    expect(pathOf(ParallelogramShapeDefinition, { x: 0, y: 0, width: 80, height: 20 }, left).commands).toEqual([
      { kind: 'move', to: [-40, -10] },
      { kind: 'line', to: [20, -10] },
      { kind: 'line', to: [40, 10] },
      { kind: 'line', to: [-20, 10] },
      { kind: 'close' },
    ]);
    expect(ParallelogramShapeDefinition.circumscribe(20, 10, { slantAngle: 90 })).toEqual({
      halfWidth: 20,
      halfHeight: 10,
    });
  });

  it('uses a fixed 12-unit shoulder depth independent of the elongated hexagon width', () => {
    expect(HexagonShapeDefinition.circumscribe(20, 10, {})).toEqual({
      halfWidth: 32,
      halfHeight: 10,
    });
    expect(HexagonShapeDefinition.circumscribe(20, 10, { shoulderDepth: 8 })).toEqual({
      halfWidth: 28,
      halfHeight: 10,
    });
    expect(pathOf(HexagonShapeDefinition, { x: 0, y: 0, width: 120, height: 20 }, {}).commands).toEqual([
      { kind: 'move', to: [-48, -10] },
      { kind: 'line', to: [48, -10] },
      { kind: 'line', to: [60, 0] },
      { kind: 'line', to: [48, 10] },
      { kind: 'line', to: [-48, 10] },
      { kind: 'line', to: [-60, 0] },
      { kind: 'close' },
    ]);
    expect(
      pathOf(HexagonShapeDefinition, { x: 0, y: 0, width: 20, height: 20 }, { shoulderDepth: 16 }).commands,
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

  it('emits a vertical cylinder as one outer contour plus one cap divider subpath', () => {
    expect(CylinderShapeDefinition.circumscribe(20, 10, {})).toEqual({ halfWidth: 20, halfHeight: 18 });
    expect(pathOf(CylinderShapeDefinition, { x: 0, y: 0, width: 40, height: 36 }, {}).commands).toEqual([
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

  it('transposes cylinder geometry for a horizontal axis and clamps only the emitted cap depth', () => {
    const params = { axis: 'horizontal', capDepth: 8 } as const;
    expect(CylinderShapeDefinition.circumscribe(20, 10, params)).toEqual({ halfWidth: 28, halfHeight: 10 });
    expect(pathOf(CylinderShapeDefinition, { x: 0, y: 0, width: 56, height: 20 }, params).commands).toEqual([
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
      CylinderShapeDefinition,
      { x: 0, y: 0, width: 10, height: 20 },
      { axis: 'horizontal', capDepth: 20 },
    );
    expect(clamped.commands[0]).toEqual({ kind: 'move', to: [0, -10] });
    expect(clamped.commands[1]).toMatchObject({ center: [0, 0], radiusX: 5, radiusY: 10 });
  });

  it('emits a vertical elliptic capsule as one closed outer contour without a cap divider', () => {
    expect(EllipticCapsuleShapeDefinition.circumscribe(20, 10, {})).toEqual({ halfWidth: 20, halfHeight: 18 });
    expect(pathOf(EllipticCapsuleShapeDefinition, { x: 0, y: 0, width: 40, height: 36 }, {}).commands).toEqual([
      { kind: 'move', to: [-20, -10] },
      { kind: 'ellipseArc', center: [0, -10], radiusX: 20, radiusY: 8, startAngle: 180, endAngle: 360 },
      { kind: 'line', to: [20, 10] },
      { kind: 'ellipseArc', center: [0, 10], radiusX: 20, radiusY: 8, startAngle: 0, endAngle: 180 },
      { kind: 'close' },
    ]);
  });

  it('transposes the elliptic capsule and degenerates zero cap depth to a rectangle', () => {
    const horizontal = { axis: 'horizontal', capDepth: 8 } as const;
    expect(EllipticCapsuleShapeDefinition.circumscribe(20, 10, horizontal)).toEqual({
      halfWidth: 28,
      halfHeight: 10,
    });
    expect(pathOf(EllipticCapsuleShapeDefinition, { x: 0, y: 0, width: 56, height: 20 }, horizontal).commands).toEqual([
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
      pathOf(EllipticCapsuleShapeDefinition, { x: 0, y: 0, width: 40, height: 36 }, { capDepth: 0 }).commands,
    ).toEqual([
      { kind: 'move', to: [-20, -18] },
      { kind: 'line', to: [20, -18] },
      { kind: 'line', to: [20, 18] },
      { kind: 'line', to: [-20, 18] },
      { kind: 'close' },
    ]);
  });

  it('expands rounded polygonal shapes until their content corners remain inside the final contour', () => {
    const sharp = TrapezoidShapeDefinition.circumscribe(36, 20, {});
    const roundedParams = { cornerRadius: 10 };
    const rounded = TrapezoidShapeDefinition.circumscribe(36, 20, roundedParams);
    expect(rounded.halfWidth).toBeGreaterThan(sharp.halfWidth);
    expect(rounded.halfHeight).toBeGreaterThan(sharp.halfHeight);

    const rect: Rect = { x: 0, y: 0, width: rounded.halfWidth * 2, height: rounded.halfHeight * 2 };
    for (const corner of [
      [-36, -20],
      [36, -20],
      [36, 20],
      [-36, 20],
    ] as const) {
      const hit = TrapezoidShapeDefinition.boundaryPoint(rect, [corner[0], corner[1]], roundedParams);
      expect(Math.hypot(...hit)).toBeGreaterThanOrEqual(Math.hypot(corner[0], corner[1]) - 1e-6);
    }
  });

  it('uses the final contour for directional boundary points', () => {
    expect(TrapezoidShapeDefinition.boundaryPoint({ x: 0, y: 0, width: 100, height: 40 }, [100, 0], {})).toEqual([
      43, 0,
    ]);
    expect(
      ParallelogramShapeDefinition.boundaryPoint({ x: 0, y: 0, width: 80, height: 20 }, [100, 0], {
        slantAngle: 45,
        slantDirection: 'right',
      }),
    ).toEqual([30, 0]);
    expect(HexagonShapeDefinition.boundaryPoint({ x: 0, y: 0, width: 80, height: 20 }, [100, 0], {})).toEqual([40, 0]);
    expect(CylinderShapeDefinition.boundaryPoint({ x: 0, y: 0, width: 40, height: 36 }, [0, -100], {})).toEqual([
      0, -18,
    ]);
    expect(EllipticCapsuleShapeDefinition.boundaryPoint({ x: 0, y: 0, width: 40, height: 36 }, [0, -100], {})).toEqual([
      0, -18,
    ]);
    expect(
      TrapezoidShapeDefinition.connectionEnvelope?.({ x: 0, y: 0, width: 100, height: 40 }, 'rectangle', {}),
    ).toEqual({ halfWidth: 50, halfHeight: 20 });
    expect(
      CylinderShapeDefinition.connectionEnvelope?.({ x: 0, y: 0, width: 40, height: 36 }, 'rectangle', {}),
    ).toEqual({ halfWidth: 20, halfHeight: 18 });
    expect(
      CylinderShapeDefinition.boundaryPoint({ x: 0, y: 0, width: 40, height: 36 }, [0, -100], { capDepth: 0 }),
    ).toEqual([0, -18]);

    const rotated = CylinderShapeDefinition.boundaryPoint(
      { x: 0, y: 0, width: 40, height: 36, rotate: Math.PI / 2 },
      [100, 0],
      {},
    );
    expect(rotated[0]).toBeCloseTo(18);
    expect(rotated[1]).toBeCloseTo(0);
  });

  it('scales only authored user-unit lengths', () => {
    expect(
      TrapezoidShapeDefinition.scaleParams?.({ shortSide: 'left', shortSideRatio: 0.6, cornerRadius: 4 }, 4, 9),
    ).toEqual({ shortSide: 'left', shortSideRatio: 0.6, cornerRadius: 24 });
    expect(
      ParallelogramShapeDefinition.scaleParams?.({ slantDirection: 'right', slantAngle: 70, cornerRadius: 4 }, 4, 9),
    ).toEqual({ slantDirection: 'right', slantAngle: 70, cornerRadius: 24 });
    expect(HexagonShapeDefinition.scaleParams?.({ shoulderDepth: 4, cornerRadius: 4 }, 4, 9)).toEqual({
      shoulderDepth: 24,
      cornerRadius: 24,
    });
    expect(CylinderShapeDefinition.scaleParams?.({ axis: 'horizontal', capDepth: 4 }, 4, 9)).toEqual({
      axis: 'horizontal',
      capDepth: 24,
    });
    expect(EllipticCapsuleShapeDefinition.scaleParams?.({ axis: 'horizontal', capDepth: 4 }, 4, 9)).toEqual({
      axis: 'horizontal',
      capDepth: 24,
    });
  });

  it('rejects invalid params and non-finite derived geometry', () => {
    expect(() => TrapezoidShapeDefinition.paramsSchema.parse({ shortSideRatio: 0 })).toThrow();
    expect(() => HexagonShapeDefinition.paramsSchema.parse({ shoulderDepth: -1 })).toThrow();
    expect(() => HexagonShapeDefinition.paramsSchema.parse({ shoulderRatio: 0.2 })).toThrow();
    expect(() => ParallelogramShapeDefinition.paramsSchema.parse({ slantAngle: 0 })).toThrow();
    expect(() => CylinderShapeDefinition.paramsSchema.parse({ capDepth: -1 })).toThrow();
    expect(() => EllipticCapsuleShapeDefinition.paramsSchema.parse({ capDepth: -1 })).toThrow();
    expect(() => EllipticCapsuleShapeDefinition.paramsSchema.parse({ capDepth: Number.POSITIVE_INFINITY })).toThrow();
    expect(() => EllipticCapsuleShapeDefinition.paramsSchema.parse({ unknown: true })).toThrow();
    expect(() => TrapezoidShapeDefinition.paramsSchema.parse({ unknown: true })).toThrow();
    expect(() => TrapezoidShapeDefinition.circumscribe(10, 10, { shortSideRatio: Number.MIN_VALUE })).toThrowError(
      expect.objectContaining({ code: 'STANDARD_GEOMETRY_INVALID' }),
    );
    expect(() => ParallelogramShapeDefinition.circumscribe(10, 10, { slantAngle: Number.MIN_VALUE })).toThrowError(
      expect.objectContaining({ code: 'STANDARD_GEOMETRY_INVALID' }),
    );
  });
});
