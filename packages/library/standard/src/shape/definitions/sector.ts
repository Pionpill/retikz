import type { CoreDependencyProvider, Rect, ScenePrimitive, ShapeAnchorName } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundaryFromContour,
  boundsConnectionEnvelope,
  contourCommands,
  contourToPathCommands,
  contourToPathPrimitive,
  defineShape,
  DEG_TO_RAD,
  filletContour,
  localToWorld,
  normalizeAngleRange,
  pathPrimitiveStyle,
  RAD_TO_DEG,
  worldToLocal,
} from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { arcBoundingPoints, arcEndPoint, boundsCenter, boundsHalfAxes, boundsOf, DEFAULT_EPSILON } from '@retikz/math';
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const SectorShapeParamsSchema = z
  .strictObject({
    innerRadius: NonNegativeNumberSchema.describe(
      'Inner radius in user units; 0 = solid pie slice, equal to outerRadius = open arc.',
    ),
    outerRadius: PositiveNumberSchema.describe(
      'Outer radius in user units; must be >= innerRadius, equality produces an open arc.',
    ),
    startAngle: z
      .number()
      .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
    endAngle: z.number().describe('End angle in degrees; swept clockwise in screen space from startAngle.'),
    cornerRadius: NonNegativeNumberSchema.optional().describe(
      'Corner radius in user units for positive-thickness sectors; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
    ),
  })
  .refine(params => params.outerRadius >= params.innerRadius, {
    message: 'outerRadius must be greater than or equal to innerRadius',
  });

/** Sector 形状的参数 */
export type SectorShapeParams = z.infer<typeof SectorShapeParamsSchema>;

/** Sector 的派生几何 */
type SectorGeometry = {
  range: { start: number; end: number; mid: number };
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  apexOffset: Position;
  centroidOffset: Position;
  boundaryOriginOffset: Position;
};

type SectorGeometryInput = Pick<SectorShapeParams, 'innerRadius' | 'outerRadius' | 'startAngle' | 'endAngle'>;

/** 计算 Sector 的极坐标范围、AABB 和局部参考点 */
const computeSectorGeometry = (params: SectorGeometryInput): SectorGeometry => {
  const { innerRadius, outerRadius } = params;
  const range = normalizeAngleRange(params.startAngle, params.endAngle);
  const apex: Position = [0, 0];
  const candidates: Array<Position> = innerRadius === 0 ? [apex] : [];
  candidates.push(
    ...arcBoundingPoints({ center: apex, radius: outerRadius, startAngleDeg: range.start, endAngleDeg: range.end }),
  );
  if (innerRadius > 0) {
    candidates.push(
      ...arcBoundingPoints({ center: apex, radius: innerRadius, startAngleDeg: range.start, endAngleDeg: range.end }),
    );
  }
  const bounds = boundsOf(candidates);
  if (bounds === undefined) throw new Error('computeSectorGeometry: bounding candidates must not be empty.');
  const aabbCenter = boundsCenter(bounds);
  const apexOffset: Position = [-aabbCenter[0], -aabbCenter[1]];
  const sweepRadians = (range.end - range.start) * DEG_TO_RAD;
  const midAngleRadians = range.mid * DEG_TO_RAD;
  const halfSweepRadians = sweepRadians / 2;
  const areaDenominator = outerRadius * outerRadius - innerRadius * innerRadius;
  const centroidRadius =
    Math.abs(halfSweepRadians) < DEFAULT_EPSILON || Math.abs(areaDenominator) < 1e-12
      ? (outerRadius + innerRadius) / 2
      : (2 / 3) *
        (Math.sin(halfSweepRadians) / halfSweepRadians) *
        ((outerRadius * outerRadius * outerRadius - innerRadius * innerRadius * innerRadius) / areaDenominator);
  const centroidLocal: Position = [
    Math.cos(midAngleRadians) * centroidRadius,
    Math.sin(midAngleRadians) * centroidRadius,
  ];
  const boundaryOriginRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : centroidRadius;
  const boundaryOriginLocal: Position = [
    Math.cos(midAngleRadians) * boundaryOriginRadius,
    Math.sin(midAngleRadians) * boundaryOriginRadius,
  ];
  return {
    range,
    aabbHalfAxes: boundsHalfAxes(bounds),
    apexOffset,
    centroidOffset: [centroidLocal[0] - aabbCenter[0], centroidLocal[1] - aabbCenter[1]],
    boundaryOriginOffset: [boundaryOriginLocal[0] - aabbCenter[0], boundaryOriginLocal[1] - aabbCenter[1]],
  };
};

/** 根据半径和角度计算 Sector 圆心局部极坐标点 */
const sectorPolarPoint = (radius: number, angleDegrees: number): Position => arcEndPoint([0, 0], radius, angleDegrees);

/** 将 Sector 圆心局部点转换为世界坐标 */
const toWorld = (rect: Rect, apexOffset: Position, localFromApex: Position): Position =>
  localToWorld(rect, [localFromApex[0] + apexOffset[0], localFromApex[1] + apexOffset[1]]);

/** 构造 Sector 闭合轮廓 */
const sectorSegments = (rect: Rect, params: SectorShapeParams) => {
  const geometry = computeSectorGeometry(params);
  const { innerRadius, outerRadius } = params;
  const { start, end } = geometry.range;
  const apex = toWorld(rect, geometry.apexOffset, [0, 0]);
  const rotationDegrees = (rect.rotate ?? 0) * RAD_TO_DEG;
  const outerStart = toWorld(rect, geometry.apexOffset, sectorPolarPoint(outerRadius, start));
  if (innerRadius > 0 && innerRadius < outerRadius) {
    const innerStart = toWorld(rect, geometry.apexOffset, sectorPolarPoint(innerRadius, start));
    const innerEnd = toWorld(rect, geometry.apexOffset, sectorPolarPoint(innerRadius, end));
    return {
      geometry,
      segments: [
        { kind: 'line' as const, from: innerStart, to: outerStart },
        {
          kind: 'arc' as const,
          center: apex,
          radius: outerRadius,
          startAngle: start + rotationDegrees,
          endAngle: end + rotationDegrees,
        },
        {
          kind: 'line' as const,
          from: toWorld(rect, geometry.apexOffset, sectorPolarPoint(outerRadius, end)),
          to: innerEnd,
        },
        {
          kind: 'arc' as const,
          center: apex,
          radius: innerRadius,
          startAngle: end + rotationDegrees,
          endAngle: start + rotationDegrees,
          counterClockwise: true,
        },
      ],
    };
  }
  return {
    geometry,
    segments: [
      { kind: 'line' as const, from: apex, to: outerStart },
      {
        kind: 'arc' as const,
        center: apex,
        radius: outerRadius,
        startAngle: start + rotationDegrees,
        endAngle: end + rotationDegrees,
      },
      { kind: 'line' as const, from: toWorld(rect, geometry.apexOffset, sectorPolarPoint(outerRadius, end)), to: apex },
    ],
  };
};

/** 计算零厚度 Sector 开放弧在目标方向上的投影点 */
const openSectorBoundaryPoint = (rect: Rect, toward: Position, params: SectorShapeParams): Position => {
  const geometry = computeSectorGeometry(params);
  const radius = params.outerRadius;
  const { start, end } = geometry.range;
  const local = worldToLocal(rect, toward);
  const fromCenter: Position = [local[0] - geometry.apexOffset[0], local[1] - geometry.apexOffset[1]];
  let angle = Math.atan2(fromCenter[1], fromCenter[0]) * RAD_TO_DEG;
  while (angle < start) angle += 360;
  while (angle >= start + 360) angle -= 360;
  const projectedAngle = angle <= end ? angle : angle - end <= start + 360 - angle ? end : start;
  return toWorld(rect, geometry.apexOffset, sectorPolarPoint(radius, projectedAngle));
};

/** 可选 Sector 形状 Definition */
export const SectorShapeDefinition = defineShape<SectorShapeParams>({
  name: StandardShapeName.Sector,
  paramsSchema: SectorShapeParamsSchema,
  circumscribe: (_halfWidth, _halfHeight, params) => computeSectorGeometry(params).aabbHalfAxes,
  circumscribeOffset: params => {
    const { apexOffset } = computeSectorGeometry(params);
    return [-apexOffset[0], -apexOffset[1]];
  },
  boundaryPoint: (rect, toward, params) => {
    if (params.innerRadius === params.outerRadius) return openSectorBoundaryPoint(rect, toward, params);
    const { geometry, segments } = sectorSegments(rect, params);
    const fillets = filletContour(segments, params.cornerRadius);
    const originWorld = localToWorld(rect, geometry.boundaryOriginOffset);
    return boundaryFromContour(segments, params.cornerRadius, originWorld, toward, fillets) ?? originWorld;
  },
  anchor: (rect, name: ShapeAnchorName, params) => {
    const geometry = computeSectorGeometry(params);
    const { innerRadius, outerRadius } = params;
    const { start, end, mid } = geometry.range;
    switch (name) {
      case 'apex':
      case 'center':
        return toWorld(rect, geometry.apexOffset, [0, 0]);
      case 'centroid':
        return localToWorld(rect, geometry.centroidOffset);
      case 'outer-arc-mid':
        return toWorld(rect, geometry.apexOffset, sectorPolarPoint(outerRadius, mid));
      case 'inner-arc-mid':
        return toWorld(rect, geometry.apexOffset, sectorPolarPoint(innerRadius, mid));
      case 'start-edge-mid':
        return toWorld(rect, geometry.apexOffset, sectorPolarPoint((innerRadius + outerRadius) / 2, start));
      case 'end-edge-mid':
        return toWorld(rect, geometry.apexOffset, sectorPolarPoint((innerRadius + outerRadius) / 2, end));
      default:
        return undefined;
    }
  },
  connectionEnvelope: boundsConnectionEnvelope,
  *emit(rect, style, round, params): Iterable<ScenePrimitive> {
    if (params.innerRadius === params.outerRadius) {
      const geometry = computeSectorGeometry(params);
      const { start, end } = geometry.range;
      const rotationDegrees = (rect.rotate ?? 0) * RAD_TO_DEG;
      const center = toWorld(rect, geometry.apexOffset, [0, 0]);
      const startPoint = toWorld(rect, geometry.apexOffset, sectorPolarPoint(params.outerRadius, start));
      yield {
        type: 'path',
        commands: [
          { kind: 'move', to: [round(startPoint[0]), round(startPoint[1])] },
          {
            kind: 'arc',
            center: [round(center[0]), round(center[1])],
            radius: round(params.outerRadius),
            startAngle: start + rotationDegrees,
            endAngle: end + rotationDegrees,
          },
        ],
        ...pathPrimitiveStyle(style, { fill: 'transparent' }),
      };
      return;
    }
    const { segments } = sectorSegments(rect, params);
    const fillets = filletContour(segments, params.cornerRadius);
    const path = contourToPathPrimitive(
      contourToPathCommands(contourCommands(segments, params.cornerRadius, fillets), round),
      style,
    );
    if (params.innerRadius > 0) path.fillRule = 'evenodd';
    yield path;
  },
  scaleParams: (params, scaleX, scaleY) => {
    const factor = Math.sqrt(scaleX * scaleY);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
      ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * factor }),
    };
  },
});

/** Sector 的静态 Core provider */
export const SectorShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: SectorShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => SectorShapeDefinition,
});
