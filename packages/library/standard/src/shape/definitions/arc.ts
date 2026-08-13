import type { CoreDependencyProvider, PathCommand, Rect, ScenePrimitive, ShapeAnchorName } from '@retikz/core';
import type { Position } from '@retikz/math';

import {
  boundsConnectionEnvelope,
  defineShape,
  localToWorld,
  normalizeAngleRange,
  pathPrimitiveStyle,
  RAD_TO_DEG,
  worldToLocal,
} from '@retikz/core';
import { PositiveNumberSchema } from '@retikz/foundation';
import { arcBoundingPoints, arcEndPoint, boundsCenter, boundsHalfAxes, boundsOf } from '@retikz/math';
import { z } from 'zod';

import { StandardShapeName } from '../constants';

const ArcShapeParamsSchema = z.strictObject({
  radius: PositiveNumberSchema.describe('Arc radius in user units.'),
  startAngle: z
    .number()
    .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
  endAngle: z.number().describe('End angle in degrees; swept from startAngle in screen space.'),
  close: z
    .boolean()
    .optional()
    .describe('When true, close the arc into a chord/segment outline (fillable); default false = open stroked arc.'),
});

/** Arc 形状的参数 */
export type ArcShapeParams = z.infer<typeof ArcShapeParamsSchema>;

/** Arc 形状的派生几何 */
type ArcGeometry = {
  range: { start: number; end: number; mid: number };
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  centerOffset: Position;
};

/** 计算以圆心为原点的 Arc AABB 与偏移 */
const computeArcGeometry = (params: ArcShapeParams): ArcGeometry => {
  const { radius, startAngle, endAngle } = params;
  const range = normalizeAngleRange(startAngle, endAngle);
  const points = arcBoundingPoints({ center: [0, 0], radius, startAngleDeg: range.start, endAngleDeg: range.end });
  const bounds = boundsOf(points);
  if (bounds === undefined) throw new Error('arc: bounding points must not be empty.');
  const aabbCenter = boundsCenter(bounds);
  return {
    range,
    aabbHalfAxes: boundsHalfAxes(bounds),
    centerOffset: [-aabbCenter[0], -aabbCenter[1]],
  };
};

/** 圆心局部点转换为世界坐标 */
const arcLocalToWorld = (rect: Rect, centerOffset: Position, localFromCenter: Position): Position =>
  localToWorld(rect, [localFromCenter[0] + centerOffset[0], localFromCenter[1] + centerOffset[1]]);

/** 可选 Arc 形状 Definition */
export const ArcShapeDefinition = defineShape<ArcShapeParams>({
  name: StandardShapeName.Arc,
  paramsSchema: ArcShapeParamsSchema,
  circumscribe: (_halfWidth, _halfHeight, params) => computeArcGeometry(params).aabbHalfAxes,
  circumscribeOffset: params => {
    const { centerOffset } = computeArcGeometry(params);
    return [-centerOffset[0], -centerOffset[1]];
  },
  boundaryPoint: (rect, toward, params) => {
    const geometry = computeArcGeometry(params);
    const { radius } = params;
    const { start, end } = geometry.range;
    const local = worldToLocal(rect, toward);
    const fx = local[0] - geometry.centerOffset[0];
    const fy = local[1] - geometry.centerOffset[1];
    let theta = Math.atan2(fy, fx) * RAD_TO_DEG;
    while (theta < start) theta += 360;
    while (theta >= start + 360) theta -= 360;
    const angle = theta <= end ? theta : theta - end <= start + 360 - theta ? end : start;
    return arcLocalToWorld(rect, geometry.centerOffset, arcEndPoint([0, 0], radius, angle));
  },
  anchor: (rect, name: ShapeAnchorName, params) => {
    const geometry = computeArcGeometry(params);
    const { radius } = params;
    const { start, end, mid } = geometry.range;
    const at = (angle: number): Position =>
      arcLocalToWorld(rect, geometry.centerOffset, arcEndPoint([0, 0], radius, angle));
    switch (name) {
      case 'center':
        return arcLocalToWorld(rect, geometry.centerOffset, [0, 0]);
      case 'arc-mid':
        return at(mid);
      case 'start':
        return at(start);
      case 'end':
        return at(end);
      default:
        return undefined;
    }
  },
  connectionEnvelope: boundsConnectionEnvelope,
  *emit(rect, style, round, params): Iterable<ScenePrimitive> {
    const geometry = computeArcGeometry(params);
    const { radius, close } = params;
    const { start, end } = geometry.range;
    const roundPoint = (point: Position): [number, number] => [round(point[0]), round(point[1])];
    const center = arcLocalToWorld(rect, geometry.centerOffset, [0, 0]);
    const startPoint = arcLocalToWorld(rect, geometry.centerOffset, arcEndPoint([0, 0], radius, start));
    const commands: Array<PathCommand> = [
      { kind: 'move', to: roundPoint(startPoint) },
      { kind: 'arc', center: roundPoint(center), radius: round(radius), startAngle: start, endAngle: end },
    ];
    if (close) commands.push({ kind: 'close' });
    yield {
      type: 'path',
      commands,
      ...pathPrimitiveStyle(style, close ? undefined : { fill: 'transparent' }),
    };
  },
  scaleParams: (params, scaleX, scaleY) => ({
    ...params,
    radius: params.radius * Math.sqrt(scaleX * scaleY),
  }),
});

const makeArcShapeDefinition = () => ArcShapeDefinition;

/** Arc 的静态 Core provider */
export const ArcShapeProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'shape', name: ArcShapeDefinition.name }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeArcShapeDefinition,
});
