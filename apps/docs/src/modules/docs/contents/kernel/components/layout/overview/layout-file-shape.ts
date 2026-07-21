import type { IRPosition, PathCommand, Rect, ShapeDefinition } from '@retikz/core';

import {
  CenterAnchor,
  DEFAULT_EPSILON,
  defineShape,
  isDirectionalAnchor,
  localToWorld,
  rect,
  worldToLocal,
} from '@retikz/core';
import { z } from 'zod';

type Position = IRPosition;

/** draw.io 风格折角文件的注册名 */
export const FileShapeName = 'drawio-file';

/** 二维向量叉积 */
const cross = (a: Position, b: Position): number => a[0] * b[1] - a[1] * b[0];

/** 根据外接框生成顺时针折角文件轮廓 */
const createFileVertices = (bounds: Rect): Array<Position> => {
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  const foldSize = Math.min(bounds.width, bounds.height) * 0.28;

  return [
    [-halfWidth, -halfHeight],
    [halfWidth - foldSize, -halfHeight],
    [halfWidth, -halfHeight + foldSize],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ];
};

/** 求中心射线与折角文件多边形的最近交点 */
const findFileBoundaryPoint = (vertices: Array<Position>, direction: Position): Position => {
  const length = Math.hypot(direction[0], direction[1]);
  const ray: Position = length < DEFAULT_EPSILON ? [1, 0] : [direction[0] / length, direction[1] / length];
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < vertices.length; index++) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    const edge: Position = [end[0] - start[0], end[1] - start[1]];
    const denominator = cross(ray, edge);
    if (Math.abs(denominator) < DEFAULT_EPSILON) continue;

    const distance = cross(start, edge) / denominator;
    const edgeRatio = cross(start, ray) / denominator;
    if (distance >= -DEFAULT_EPSILON && edgeRatio >= -DEFAULT_EPSILON && edgeRatio <= 1 + DEFAULT_EPSILON) {
      nearestDistance = Math.min(nearestDistance, distance);
    }
  }

  const distance = Number.isFinite(nearestDistance) ? nearestDistance : 0;
  return [ray[0] * distance, ray[1] * distance];
};

/** 将局部点序列转成 Scene path commands */
const toPathCommands = (
  bounds: Rect,
  points: Array<Position>,
  round: (value: number) => number,
  close = false,
): Array<PathCommand> => {
  const commands: Array<PathCommand> = points.map((point, index) => {
    const world = localToWorld(bounds, point);
    const to: Position = [round(world[0]), round(world[1])];
    return index === 0 ? { kind: 'move', to } : { kind: 'line', to };
  });
  if (close) commands.push({ kind: 'close' });
  return commands;
};

/** draw.io 风格折角文件 ShapeDefinition */
export const fileShape: ShapeDefinition = defineShape({
  name: FileShapeName,
  paramsSchema: z.strictObject({}),
  circumscribe: (halfWidth, halfHeight) => ({
    halfWidth: Math.max(halfWidth, 42),
    halfHeight: Math.max(halfHeight, 52),
  }),
  boundaryPoint: (bounds, toward) => {
    const localToward = worldToLocal(bounds, toward);
    const boundary = findFileBoundaryPoint(createFileVertices(bounds), localToward);
    return localToWorld(bounds, boundary);
  },
  anchor: (bounds, name) => {
    if (name === CenterAnchor.Center || !isDirectionalAnchor(name)) return undefined;
    const toward = rect.anchor(bounds, name);
    const localToward = worldToLocal(bounds, toward);
    return localToWorld(bounds, findFileBoundaryPoint(createFileVertices(bounds), localToward));
  },
  *emit(bounds, style, round) {
    const vertices = createFileVertices(bounds);
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    const foldSize = Math.min(bounds.width, bounds.height) * 0.28;

    yield {
      type: 'path',
      commands: toPathCommands(bounds, vertices, round, true),
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      dashOffset: style.dashOffset,
      opacity: style.opacity,
      blendMode: style.blendMode,
    };

    yield {
      type: 'path',
      commands: toPathCommands(
        bounds,
        [
          [halfWidth - foldSize, -halfHeight],
          [halfWidth - foldSize, -halfHeight + foldSize],
          [halfWidth, -halfHeight + foldSize],
        ],
        round,
      ),
      fill: 'transparent',
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      dashOffset: style.dashOffset,
      opacity: style.opacity,
      blendMode: style.blendMode,
    };
  },
});
