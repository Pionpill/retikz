import type { CoreDependencyProvider, PathCommand, Rect, ScenePrimitive } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundsConnectionEnvelope,
  CenterAnchor,
  contourToPathPrimitive,
  defineShape,
  isDirectionalAnchor,
  localToWorld,
  rect,
  worldToLocal,
} from '@retikz/core';
import { NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const CylinderShapeParamsSchema = z.strictObject({
  axis: z.enum(['vertical', 'horizontal']).optional().describe('Cylinder main axis.'),
  capDepth: NonNegativeNumberSchema.optional().describe('Depth of each elliptical cap in user units.'),
});

/** Cylinder 形状参数 */
export type CylinderShapeParams = z.infer<typeof CylinderShapeParamsSchema>;

const axisOf = (params: CylinderShapeParams): 'vertical' | 'horizontal' => params.axis ?? 'vertical';
const capDepthOf = (params: CylinderShapeParams): number => params.capDepth ?? 8;

/** 沿局部中心射线求两点线段的最近正向交点参数 */
const rayLineParameter = (direction: Position, from: Position, to: Position): number | undefined => {
  const edgeX = to[0] - from[0];
  const edgeY = to[1] - from[1];
  const determinant = direction[0] * -edgeY + edgeX * direction[1];
  if (Math.abs(determinant) < 1e-12) return undefined;
  const rayParameter = (from[0] * -edgeY + edgeX * from[1]) / determinant;
  const edgeParameter = (direction[0] * from[1] - from[0] * direction[1]) / determinant;
  return rayParameter > 1e-12 && edgeParameter >= -1e-9 && edgeParameter <= 1 + 1e-9 ? rayParameter : undefined;
};

/** 沿局部中心射线求椭圆的正向交点参数 */
const rayEllipseParameters = (
  direction: Position,
  center: Position,
  radiusX: number,
  radiusY: number,
): Array<number> => {
  if (radiusX <= 0 || radiusY <= 0) return [];
  const a = (direction[0] * direction[0]) / (radiusX * radiusX) + (direction[1] * direction[1]) / (radiusY * radiusY);
  const b =
    (-2 * direction[0] * center[0]) / (radiusX * radiusX) + (-2 * direction[1] * center[1]) / (radiusY * radiusY);
  const c = (center[0] * center[0]) / (radiusX * radiusX) + (center[1] * center[1]) / (radiusY * radiusY) - 1;
  const discriminant = b * b - 4 * a * c;
  if (a <= 0 || discriminant < 0) return [];
  const root = Math.sqrt(discriminant);
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter(value => value > 1e-12);
};

/** 计算 Cylinder 最终外轮廓上的局部边界点 */
const cylinderLocalBoundary = (bounds: Rect, toward: Position, params: CylinderShapeParams): Position => {
  const direction = worldToLocal(bounds, toward);
  if (Math.hypot(...direction) < 1e-12) return [0, 0];
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const candidates: Array<number> = [];
  const consider = (value: number | undefined): void => {
    if (value !== undefined && Number.isFinite(value) && value > 1e-12) candidates.push(value);
  };

  if (axisOf(params) === 'vertical') {
    const depth = Math.min(capDepthOf(params), halfHeight);
    if (depth === 0) {
      const scale = Math.min(
        direction[0] === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(direction[0]),
        direction[1] === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(direction[1]),
      );
      return Number.isFinite(scale) ? [direction[0] * scale, direction[1] * scale] : [0, 0];
    }
    const bodyHalfHeight = halfHeight - depth;
    consider(rayLineParameter(direction, [-halfWidth, -bodyHalfHeight], [-halfWidth, bodyHalfHeight]));
    consider(rayLineParameter(direction, [halfWidth, -bodyHalfHeight], [halfWidth, bodyHalfHeight]));
    for (const centerY of [-bodyHalfHeight, bodyHalfHeight]) {
      for (const parameter of rayEllipseParameters(direction, [0, centerY], halfWidth, depth)) {
        const y = direction[1] * parameter;
        if ((centerY <= 0 && y <= centerY + 1e-9) || (centerY >= 0 && y >= centerY - 1e-9)) consider(parameter);
      }
    }
  } else {
    const depth = Math.min(capDepthOf(params), halfWidth);
    if (depth === 0) {
      const scale = Math.min(
        direction[0] === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(direction[0]),
        direction[1] === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(direction[1]),
      );
      return Number.isFinite(scale) ? [direction[0] * scale, direction[1] * scale] : [0, 0];
    }
    const bodyHalfWidth = halfWidth - depth;
    consider(rayLineParameter(direction, [-bodyHalfWidth, -halfHeight], [bodyHalfWidth, -halfHeight]));
    consider(rayLineParameter(direction, [-bodyHalfWidth, halfHeight], [bodyHalfWidth, halfHeight]));
    for (const centerX of [-bodyHalfWidth, bodyHalfWidth]) {
      for (const parameter of rayEllipseParameters(direction, [centerX, 0], depth, halfHeight)) {
        const x = direction[0] * parameter;
        if ((centerX <= 0 && x <= centerX + 1e-9) || (centerX >= 0 && x >= centerX - 1e-9)) consider(parameter);
      }
    }
  }

  const nearest = Math.min(...candidates);
  return Number.isFinite(nearest) ? [direction[0] * nearest, direction[1] * nearest] : [0, 0];
};

/** 生成 Cylinder 外轮廓与端盖分隔弧命令 */
const cylinderCommands = (
  bounds: Rect,
  params: CylinderShapeParams,
  round: (value: number) => number,
): Array<PathCommand> => {
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const point = ([x, y]: Position): Position => [round(bounds.x + x), round(bounds.y + y)];
  if (axisOf(params) === 'vertical') {
    const depth = Math.min(capDepthOf(params), halfHeight);
    if (depth === 0) {
      return [
        { kind: 'move', to: point([-halfWidth, -halfHeight]) },
        { kind: 'line', to: point([halfWidth, -halfHeight]) },
        { kind: 'line', to: point([halfWidth, halfHeight]) },
        { kind: 'line', to: point([-halfWidth, halfHeight]) },
        { kind: 'close' },
      ];
    }
    const bodyHalfHeight = halfHeight - depth;
    return [
      { kind: 'move', to: point([-halfWidth, -bodyHalfHeight]) },
      {
        kind: 'ellipseArc',
        center: point([0, -bodyHalfHeight]),
        radiusX: round(halfWidth),
        radiusY: round(depth),
        startAngle: 180,
        endAngle: 360,
      },
      { kind: 'line', to: point([halfWidth, bodyHalfHeight]) },
      {
        kind: 'ellipseArc',
        center: point([0, bodyHalfHeight]),
        radiusX: round(halfWidth),
        radiusY: round(depth),
        startAngle: 0,
        endAngle: 180,
      },
      { kind: 'close' },
      { kind: 'move', to: point([halfWidth, -bodyHalfHeight]) },
      {
        kind: 'ellipseArc',
        center: point([0, -bodyHalfHeight]),
        radiusX: round(halfWidth),
        radiusY: round(depth),
        startAngle: 0,
        endAngle: 180,
      },
    ];
  }
  const depth = Math.min(capDepthOf(params), halfWidth);
  if (depth === 0) {
    return [
      { kind: 'move', to: point([-halfWidth, -halfHeight]) },
      { kind: 'line', to: point([halfWidth, -halfHeight]) },
      { kind: 'line', to: point([halfWidth, halfHeight]) },
      { kind: 'line', to: point([-halfWidth, halfHeight]) },
      { kind: 'close' },
    ];
  }
  const bodyHalfWidth = halfWidth - depth;
  return [
    { kind: 'move', to: point([-bodyHalfWidth, -halfHeight]) },
    {
      kind: 'ellipseArc',
      center: point([-bodyHalfWidth, 0]),
      radiusX: round(depth),
      radiusY: round(halfHeight),
      startAngle: 270,
      endAngle: 90,
      counterClockwise: true,
    },
    { kind: 'line', to: point([bodyHalfWidth, halfHeight]) },
    {
      kind: 'ellipseArc',
      center: point([bodyHalfWidth, 0]),
      radiusX: round(depth),
      radiusY: round(halfHeight),
      startAngle: 90,
      endAngle: -90,
      counterClockwise: true,
    },
    { kind: 'close' },
    { kind: 'move', to: point([-bodyHalfWidth, halfHeight]) },
    {
      kind: 'ellipseArc',
      center: point([-bodyHalfWidth, 0]),
      radiusX: round(depth),
      radiusY: round(halfHeight),
      startAngle: 90,
      endAngle: 270,
      counterClockwise: true,
    },
  ];
};

/** 可选 Cylinder 形状 Definition */
export const CylinderShapeDefinition = defineShape<CylinderShapeParams>({
  name: StandardShapeName.Cylinder,
  paramsSchema: CylinderShapeParamsSchema,
  circumscribe: (innerHalfWidth, innerHalfHeight, params) =>
    axisOf(params) === 'vertical'
      ? { halfWidth: innerHalfWidth, halfHeight: innerHalfHeight + capDepthOf(params) }
      : { halfWidth: innerHalfWidth + capDepthOf(params), halfHeight: innerHalfHeight },
  boundaryPoint: (bounds, toward, params) => localToWorld(bounds, cylinderLocalBoundary(bounds, toward, params)),
  anchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind) => boundsConnectionEnvelope(bounds, kind),
  *emit(bounds, style, round, params): Iterable<ScenePrimitive> {
    yield contourToPathPrimitive(cylinderCommands(bounds, params, round), style);
  },
  scaleParams: (params, scaleX, scaleY) => ({
    ...params,
    ...(params.capDepth === undefined ? {} : { capDepth: params.capDepth * Math.sqrt(scaleX * scaleY) }),
  }),
});

/** Cylinder 的静态 Core provider */
export const CylinderShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: CylinderShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => CylinderShapeDefinition,
});
