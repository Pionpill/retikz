import type { CoreDependencyProvider, Rect, ScenePrimitive } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundaryFromContour,
  CenterAnchor,
  contourCommands,
  contourToPathCommands,
  contourToPathPrimitive,
  defineShape,
  isDirectionalAnchor,
  localToWorld,
  pointsConnectionEnvelope,
  rect,
  verticesToSegments,
} from '@retikz/core';
import { PositiveNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const CrossDimensionSchema = z.strictObject({
  default: PositiveNumberSchema.describe('Fallback dimension in user units.'),
  horizontal: PositiveNumberSchema.optional().describe('Horizontal-axis override in user units.'),
  vertical: PositiveNumberSchema.optional().describe('Vertical-axis override in user units.'),
});

const CrossHeightSchema = CrossDimensionSchema.extend({
  top: PositiveNumberSchema.optional().describe('Top-side override in user units.'),
  right: PositiveNumberSchema.optional().describe('Right-side override in user units.'),
  bottom: PositiveNumberSchema.optional().describe('Bottom-side override in user units.'),
  left: PositiveNumberSchema.optional().describe('Left-side override in user units.'),
});

const CrossShapeParamsSchema = z.strictObject({
  width: z
    .union([PositiveNumberSchema, CrossDimensionSchema])
    .optional()
    .describe('Arm thickness: scalar or horizontal/vertical overrides.'),
  height: z
    .union([PositiveNumberSchema, CrossHeightSchema])
    .optional()
    .describe('Arm extent: scalar or side overrides with horizontal/vertical fallbacks.'),
});

/** Cross 形状的参数 */
export type CrossShapeParams = z.infer<typeof CrossShapeParamsSchema>;

type CrossDimension = NonNullable<CrossShapeParams['width']>;
type CrossHeight = NonNullable<CrossShapeParams['height']>;

type CrossGeometry = {
  vertices: Array<Position>;
  halfWidth: number;
  halfHeight: number;
  offset: Position;
};

/** 规范化 Cross 的轴向宽度，按轴向值再回退到 default */
const normalizeCrossAxisValue = (
  value: number | CrossDimension | CrossHeight | undefined,
  axis: 'horizontal' | 'vertical',
  fallback: number,
): number => {
  if (typeof value === 'number') return value;
  return value?.[axis] ?? value?.default ?? fallback;
};

/** 规范化 Cross 的方向高度，按方向、轴向、default 的顺序回退 */
const normalizeCrossSideValue = (
  value: number | CrossHeight | undefined,
  side: 'top' | 'right' | 'bottom' | 'left',
  axis: 'horizontal' | 'vertical',
  fallback: number,
): number => {
  if (typeof value === 'number') return value;
  return value?.[side] ?? value?.[axis] ?? value?.default ?? fallback;
};

/** 计算 Cross 的局部轮廓、外接半轴以及非对称高度产生的中心偏移 */
const crossGeometry = (
  params: CrossShapeParams,
  fallbackHalfWidth: number,
  fallbackHalfHeight: number,
): CrossGeometry => {
  const horizontalWidth = normalizeCrossAxisValue(params.width, 'horizontal', (fallbackHalfHeight * 2) / 3);
  const verticalWidth = normalizeCrossAxisValue(params.width, 'vertical', (fallbackHalfWidth * 2) / 3);
  const topHeight = normalizeCrossSideValue(params.height, 'top', 'vertical', fallbackHalfHeight);
  const rightHeight = normalizeCrossSideValue(params.height, 'right', 'horizontal', fallbackHalfWidth);
  const bottomHeight = normalizeCrossSideValue(params.height, 'bottom', 'vertical', fallbackHalfHeight);
  const leftHeight = normalizeCrossSideValue(params.height, 'left', 'horizontal', fallbackHalfWidth);
  const halfHorizontalWidth = horizontalWidth / 2;
  const halfVerticalWidth = verticalWidth / 2;
  const halfWidth = Math.max((leftHeight + rightHeight) / 2, halfVerticalWidth);
  const halfHeight = Math.max((topHeight + bottomHeight) / 2, halfHorizontalWidth);
  const offset: Position = [(rightHeight - leftHeight) / 2, (bottomHeight - topHeight) / 2];
  const vertices: Array<Position> = [
    [-halfVerticalWidth, -topHeight],
    [halfVerticalWidth, -topHeight],
    [halfVerticalWidth, -halfHorizontalWidth],
    [rightHeight, -halfHorizontalWidth],
    [rightHeight, halfHorizontalWidth],
    [halfVerticalWidth, halfHorizontalWidth],
    [halfVerticalWidth, bottomHeight],
    [-halfVerticalWidth, bottomHeight],
    [-halfVerticalWidth, halfHorizontalWidth],
    [-leftHeight, halfHorizontalWidth],
    [-leftHeight, -halfHorizontalWidth],
    [-halfVerticalWidth, -halfHorizontalWidth],
  ];
  return { vertices, halfWidth, halfHeight, offset };
};

/** 将 Cross 的局部轮廓转换为相对外接矩形中心的坐标 */
const crossLocalVertices = (bounds: Rect, params: CrossShapeParams): Array<Position> => {
  const geometry = crossGeometry(params, bounds.width / 2, bounds.height / 2);
  return geometry.vertices.map(([x, y]) => [x - geometry.offset[0], y - geometry.offset[1]]);
};

/** 将 Cross 的局部轮廓转换为世界坐标 */
const crossVertices = (bounds: Rect, params: CrossShapeParams): Array<Position> =>
  crossLocalVertices(bounds, params).map(point => localToWorld(bounds, point));

/** 根据内容尺寸计算 Cross 的外接几何 */
const circumscribeCross = (halfWidth: number, halfHeight: number, params: CrossShapeParams): CrossGeometry =>
  crossGeometry(params, halfWidth * 3, halfHeight * 3);

/** 可选 Cross 形状 Definition */
export const CrossShapeDefinition = defineShape<CrossShapeParams>({
  name: StandardShapeName.Cross,
  paramsSchema: CrossShapeParamsSchema,
  circumscribe: (halfWidth, halfHeight, params) => {
    const geometry = circumscribeCross(halfWidth, halfHeight, params);
    return { halfWidth: geometry.halfWidth, halfHeight: geometry.halfHeight };
  },
  circumscribeOffset: params => circumscribeCross(0, 0, params).offset,
  boundaryPoint: (bounds, toward, params) => {
    const center: Position = [bounds.x, bounds.y];
    return boundaryFromContour(verticesToSegments(crossVertices(bounds, params)), undefined, center, toward) ?? center;
  },
  anchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind, params) => pointsConnectionEnvelope(crossLocalVertices(bounds, params), kind),
  *emit(bounds, style, round, params): Iterable<ScenePrimitive> {
    const commands = contourToPathCommands(contourCommands(verticesToSegments(crossVertices(bounds, params))), round);
    yield contourToPathPrimitive(commands, style);
  },
});

/** Cross 的静态 Core provider */
export const CrossShapeProvider: CoreDependencyProvider = Object.freeze({
  key: { capability: 'shape', name: CrossShapeDefinition.name },
  dependencies: [],
  datasets: {},
  makeDefinition: () => CrossShapeDefinition,
});
