import type { CoreDependencyProvider, Rect, ScenePrimitive, ShapeAnchorName } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundaryFromContour,
  boundsConnectionEnvelope,
  contourCommands,
  contourToPathCommands,
  contourToPathPrimitive,
  defineShape,
  filletContour,
  localToWorld,
  RAD_TO_DEG,
} from '@retikz/core';
import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { StandardShapeName } from '../constants';
import { sectorGeometry, sectorPolarPoint } from './sector-geometry';

const SectorShapeParamsSchema = z
  .strictObject({
    innerRadius: NonNegativeNumberSchema.describe('Inner radius (user units); 0 = solid pie slice.'),
    outerRadius: PositiveNumberSchema.describe('Outer radius (user units); must be > innerRadius.'),
    startAngle: z
      .number()
      .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
    endAngle: z.number().describe('End angle in degrees; swept clockwise in screen space from startAngle.'),
    cornerRadius: NonNegativeNumberSchema.optional().describe(
      'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
    ),
  })
  .refine(params => params.outerRadius > params.innerRadius, {
    message: 'outerRadius must be greater than innerRadius',
  });

/** Sector 形状的参数 */
export type SectorShapeParams = z.infer<typeof SectorShapeParamsSchema>;

/** 将 Sector 圆心局部点转换为世界坐标 */
const toWorld = (rect: Rect, apexOffset: Position, localFromApex: Position): Position =>
  localToWorld(rect, [localFromApex[0] + apexOffset[0], localFromApex[1] + apexOffset[1]]);

/** 构造 Sector 闭合轮廓 */
const sectorSegments = (rect: Rect, params: SectorShapeParams) => {
  const geometry = sectorGeometry(params);
  const { innerRadius, outerRadius } = params;
  const { start, end } = geometry.range;
  const apex = toWorld(rect, geometry.apexOffset, [0, 0]);
  const rotationDegrees = (rect.rotate ?? 0) * RAD_TO_DEG;
  const outerStart = toWorld(rect, geometry.apexOffset, sectorPolarPoint(outerRadius, start));
  if (innerRadius > 0) {
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

/** 可选 Sector 形状 Definition */
export const SectorShapeDefinition = defineShape<SectorShapeParams>({
  name: StandardShapeName.Sector,
  paramsSchema: SectorShapeParamsSchema,
  circumscribe: (_halfWidth, _halfHeight, params) => sectorGeometry(params).aabbHalfAxes,
  circumscribeOffset: params => {
    const { apexOffset } = sectorGeometry(params);
    return [-apexOffset[0], -apexOffset[1]];
  },
  boundaryPoint: (rect, toward, params) => {
    const { geometry, segments } = sectorSegments(rect, params);
    const fillets = filletContour(segments, params.cornerRadius);
    const originWorld = localToWorld(rect, geometry.boundaryOriginOffset);
    return boundaryFromContour(segments, params.cornerRadius, originWorld, toward, fillets) ?? originWorld;
  },
  anchor: (rect, name: ShapeAnchorName, params) => {
    const geometry = sectorGeometry(params);
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

const makeSectorShapeDefinition = () => SectorShapeDefinition;

/** Sector 的静态 Core provider */
export const SectorShapeProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'shape', name: SectorShapeDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeSectorShapeDefinition,
});
