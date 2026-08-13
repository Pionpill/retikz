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
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const CrossShapeParamsSchema = z.strictObject({});

/** Cross 形状的参数 */
export type CrossShapeParams = z.infer<typeof CrossShapeParamsSchema>;

/** 由外接矩形生成等臂十字形的十二个顶点 */
const crossLocalVertices = (bounds: Rect): Array<Position> => {
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const armHalfWidth = halfWidth / 3;
  const armHalfHeight = halfHeight / 3;
  return [
    [-armHalfWidth, -halfHeight],
    [armHalfWidth, -halfHeight],
    [armHalfWidth, -armHalfHeight],
    [halfWidth, -armHalfHeight],
    [halfWidth, armHalfHeight],
    [armHalfWidth, armHalfHeight],
    [armHalfWidth, halfHeight],
    [-armHalfWidth, halfHeight],
    [-armHalfWidth, armHalfHeight],
    [-halfWidth, armHalfHeight],
    [-halfWidth, -armHalfHeight],
    [-armHalfWidth, -armHalfHeight],
  ];
};

/** 十字形的世界坐标顶点 */
const crossVertices = (bounds: Rect): Array<Position> =>
  crossLocalVertices(bounds).map(point => localToWorld(bounds, point));

/** 可选 Cross 形状 Definition */
export const CrossShapeDefinition = defineShape<CrossShapeParams>({
  name: StandardShapeName.Cross,
  paramsSchema: CrossShapeParamsSchema,
  circumscribe: (halfWidth, halfHeight) => ({ halfWidth: halfWidth * 3, halfHeight: halfHeight * 3 }),
  boundaryPoint: (bounds, toward) => {
    const center: Position = [bounds.x, bounds.y];
    return boundaryFromContour(verticesToSegments(crossVertices(bounds)), undefined, center, toward) ?? center;
  },
  anchor: (bounds, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind) => pointsConnectionEnvelope(crossLocalVertices(bounds), kind),
  *emit(bounds, style, round): Iterable<ScenePrimitive> {
    const commands = contourToPathCommands(contourCommands(verticesToSegments(crossVertices(bounds))), round);
    yield contourToPathPrimitive(commands, style);
  },
});

const makeCrossShapeDefinition = () => CrossShapeDefinition;

/** Cross 的静态 Core provider */
export const CrossShapeProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'shape', name: CrossShapeDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeCrossShapeDefinition,
});
