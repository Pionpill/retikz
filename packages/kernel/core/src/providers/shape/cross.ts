import type { Position } from '@retikz/math';

import { z } from 'zod';

import type { ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { ContourSegment, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import {
  boundaryFromContour,
  CenterAnchor,
  contourCommands,
  isDirectionalAnchor,
  localToWorld,
  pointsConnectionEnvelope,
  rect,
} from '../../shared';
import { contourToPathCommands, contourToPathPrimitive, verticesToSegments } from './outline';

const crossParamsSchema = z.strictObject({});

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

/** 内置等臂十字形；中心交叠区域完整容纳正文 */
export const cross = defineShape({
  name: BuiltinShape.Cross,
  paramsSchema: crossParamsSchema,
  circumscribe: (halfWidth, halfHeight) => ({ halfWidth: halfWidth * 3, halfHeight: halfHeight * 3 }),
  boundaryPoint: (bounds: Rect, toward: Position): Position => {
    const center: Position = [bounds.x, bounds.y];
    const segments: Array<ContourSegment> = verticesToSegments(crossVertices(bounds));
    return boundaryFromContour(segments, undefined, center, toward) ?? center;
  },
  anchor: (bounds: Rect, name: ShapeAnchorName): Position | undefined => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind) => pointsConnectionEnvelope(crossLocalVertices(bounds), kind),
  *emit(bounds: Rect, style, round): Iterable<ScenePrimitive> {
    const segments: Array<ContourSegment> = verticesToSegments(crossVertices(bounds));
    const commands = contourToPathCommands(contourCommands(segments), round);
    yield contourToPathPrimitive(commands, style);
  },
});
