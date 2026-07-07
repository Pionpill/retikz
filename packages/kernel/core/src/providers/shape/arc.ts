import type { Position } from '@retikz/math';

import { arcBoundingPoints, arcEndPoint, boundsCenter, boundsHalfAxes, boundsOf } from '@retikz/math';
import { z } from 'zod';

import type { PathCommand, ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { Rect } from '../../shared';

import { defineShape } from '../../contract';
import { createCache, localToWorld, normalizeAngleRange, RAD_TO_DEG, worldToLocal } from '../../shared';
import { pathPrimitiveStyle } from './style';

const arcParamsSchema = z.strictObject({
  radius: z.number().positive().describe('Arc radius in user units.'),
  startAngle: z
    .number()
    .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
  endAngle: z.number().describe('End angle in degrees; swept from startAngle in screen space.'),
  close: z
    .boolean()
    .optional()
    .describe('When true, close the arc into a chord/segment outline (fillable); default false = open stroked arc.'),
});

type ArcParams = z.infer<typeof arcParamsSchema>;

/** arc 的派生几何类型：圆心局部系 AABB + 圆心相对 AABB 中心偏移 */
type ArcGeometry = {
  /** 规范化后的起止角与弧中点角度。 */
  range: { start: number; end: number; mid: number };
  /** 覆盖整段弧线的精确 AABB 半轴。 */
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  /** 圆心相对 AABB 中心的偏移；投影到 rect 前先加到圆心局部点上。 */
  centerOffset: Position;
};

/** arc 的派生几何：圆心局部系 AABB + 圆心相对 AABB 中心偏移 */
const computeArcGeometry = (params: ArcParams): ArcGeometry => {
  const { radius, startAngle, endAngle } = params;
  const range = normalizeAngleRange(startAngle, endAngle);
  const center: Position = [0, 0];
  // close=true（弓形）含弦 / 区域，AABB 由弧 bbox 点决定；圆心本身不强制进框（开放弧 / 弓形都不含圆心）
  const points = arcBoundingPoints(center, radius, range.start, range.end);
  const bounds = boundsOf(points);
  if (bounds === undefined) throw new Error('arc: bounding points must not be empty.');
  const aabbCenter = boundsCenter(bounds);
  return {
    range,
    aabbHalfAxes: boundsHalfAxes(bounds),
    centerOffset: [-aabbCenter[0], -aabbCenter[1]],
  };
};

const ARC_GEOMETRY_CACHE_LIMIT = 256;

const arcGeometry = createCache<ArcParams, ArcGeometry>({
  keyOf: params => `${params.radius}|${params.startAngle}|${params.endAngle}|${params.close === true ? 1 : 0}`,
  compute: computeArcGeometry,
  maxSize: ARC_GEOMETRY_CACHE_LIMIT,
});

/** 圆心局部点（相对圆心）→ 世界系（+centerOffset 到相对 AABB 中心后经 rect 投影） */
const arcLocalToWorld = (rect: Rect, centerOffset: Position, localFromCenter: Position): Position =>
  localToWorld(rect, [localFromCenter[0] + centerOffset[0], localFromCenter[1] + centerOffset[1]]);

/**
 * arc 注册项：单半径弧线。
 * @description close=true 时闭合成可填充弓形；anchor 提供 center / start / end / arc-mid。
 *   scaleParams 只缩 radius。
 */
export const arc = defineShape<ArcParams>({
  name: 'arc',
  paramsSchema: arcParamsSchema,
  circumscribe: (_hw, _hh, params) => arcGeometry(params).aabbHalfAxes,
  // position = 圆心；AABB 中心相对圆心的偏移 = −centerOffset（centerOffset 是圆心相对 AABB 中心）
  circumscribeOffset: (params): Position => {
    const { centerOffset } = arcGeometry(params);
    return [-centerOffset[0], -centerOffset[1]];
  },
  boundaryPoint: (rect: Rect, toward: Position, params): Position => {
    const geo = arcGeometry(params);
    const { radius } = params;
    const { start, end } = geo.range;
    // 弧无 2D 内部（开放曲线）：把 toward 投到弧的圆心局部系求角，clamp 进 [start, end]，取弧上最近点作附着点
    // （优于恒取弧中点——反方向连线不再穿过整条弧）。
    const local = worldToLocal(rect, toward);
    const fx = local[0] - geo.centerOffset[0];
    const fy = local[1] - geo.centerOffset[1];
    let theta = Math.atan2(fy, fx) * RAD_TO_DEG;
    while (theta < start) theta += 360;
    while (theta >= start + 360) theta -= 360;
    // theta 落在跨度内直接用；落在 [end, start+360) 缺口里则 clamp 到角向更近的端点
    const angle = theta <= end ? theta : theta - end <= start + 360 - theta ? end : start;
    return arcLocalToWorld(rect, geo.centerOffset, arcEndPoint([0, 0], radius, angle));
  },
  anchor: (rect: Rect, name: ShapeAnchorName, params): Position | undefined => {
    const geo = arcGeometry(params);
    const { radius } = params;
    const { start, end, mid } = geo.range;
    const at = (angle: number): Position => arcLocalToWorld(rect, geo.centerOffset, arcEndPoint([0, 0], radius, angle));
    switch (name) {
      case 'center':
        return arcLocalToWorld(rect, geo.centerOffset, [0, 0]);
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
  *emit(rect: Rect, style, round, params): Iterable<ScenePrimitive> {
    const geo = arcGeometry(params);
    const { radius, close } = params;
    const { start, end } = geo.range;
    const rp = (p: Position): [number, number] => [round(p[0]), round(p[1])];
    const center = arcLocalToWorld(rect, geo.centerOffset, [0, 0]);
    const startPoint = arcLocalToWorld(rect, geo.centerOffset, arcEndPoint([0, 0], radius, start));
    const commands: Array<PathCommand> = [
      { kind: 'move', to: rp(startPoint) },
      { kind: 'arc', center: rp(center), radius: round(radius), startAngle: start, endAngle: end },
    ];
    if (close) commands.push({ kind: 'close' });
    yield {
      type: 'path',
      commands,
      ...pathPrimitiveStyle(style, close ? undefined : { fill: 'transparent' }),
    };
  },
  scaleParams: (params, sx: number, sy: number) => ({
    ...params,
    radius: params.radius * Math.sqrt(sx * sy),
  }),
});
