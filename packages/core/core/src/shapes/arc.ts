import { z } from 'zod';
import { arcBoundingPoints, arcEndPoint } from '../geometry/arc';
import { localToWorld } from '../geometry/transform';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import type { PathCommand, ScenePrimitive } from '../primitive';
import { defineShape } from './define';
import { normalizeAngularRange } from './shared';

/**
 * arc shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；半径 + 起止角 + 可选闭合。
 */
type ArcParams = {
  radius: number;
  startAngle: number;
  endAngle: number;
  close?: boolean;
};

/** arc 的派生几何：圆心局部系 AABB + 圆心相对 AABB 中心偏移 */
const arcGeometry = (
  params: ArcParams,
): {
  range: { start: number; end: number; mid: number };
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  centerOffset: Position;
} => {
  const { radius } = params;
  const range = normalizeAngularRange(params.startAngle, params.endAngle);
  const center: Position = [0, 0];
  // close=true（弓形）含弦 / 区域，AABB 由弧 bbox 点决定；圆心本身不强制进框（开放弧 / 弓形都不含圆心）
  const points = arcBoundingPoints(center, radius, range.start, range.end);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [px, py] of points) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }
  const aabbCenter: Position = [(minX + maxX) / 2, (minY + maxY) / 2];
  return {
    range,
    aabbHalfAxes: { halfWidth: (maxX - minX) / 2, halfHeight: (maxY - minY) / 2 },
    centerOffset: [-aabbCenter[0], -aabbCenter[1]],
  };
};

/** 圆心局部点（相对圆心）→ 世界系（+centerOffset 到相对 AABB 中心后经 rect 投影） */
const arcLocalToWorld = (
  rect: Rect,
  centerOffset: Position,
  localFromCenter: Position,
): Position =>
  localToWorld(rect, [
    localFromCenter[0] + centerOffset[0],
    localFromCenter[1] + centerOffset[1],
  ]);

/**
 * arc 注册项：单半径曲线（描边、可选闭合为弓形）
 * @description circumscribe 返回弧 bbox 半轴（含弧跨过的 90°·k 轴向极值点），node position = AABB 中心；
 *   emit 出弧 path（close=false 开放描边、无 close 命令；close=true 弦闭合成弓形可填充）；anchor 提供
 *   arc-mid（弧中点）/ start / end / center（圆心）。scaleParams 只缩 radius、不缩角度与 close。
 */
export const arc = defineShape({
  paramsSchema: z.strictObject({
    radius: z
      .number()
      .finite()
      .positive()
      .describe('Arc radius in user units.'),
    startAngle: z
      .number()
      .finite()
      .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
    endAngle: z
      .number()
      .finite()
      .describe('End angle in degrees; swept from startAngle in screen space.'),
    close: z
      .boolean()
      .optional()
      .describe('When true, close the arc into a chord/segment outline (fillable); default false = open stroked arc.'),
  }),
  circumscribe: (_hw, _hh, params: ArcParams) => arcGeometry(params).aabbHalfAxes,
  // position = 圆心；AABB 中心相对圆心的偏移 = −centerOffset（centerOffset 是圆心相对 AABB 中心）
  circumscribeOffset: (params: ArcParams): Position => {
    const { centerOffset } = arcGeometry(params);
    return [-centerOffset[0], -centerOffset[1]];
  },
  boundaryPoint: (rect: Rect, _toward: Position, params: ArcParams): Position => {
    const geo = arcGeometry(params);
    // 弧无 2D 内部（开放曲线）；以弧中点作附着点兜底
    return arcLocalToWorld(rect, geo.centerOffset, arcEndPoint([0, 0], params.radius, geo.range.mid));
  },
  anchor: (rect: Rect, name: string, params: ArcParams): Position | undefined => {
    const geo = arcGeometry(params);
    const { radius } = params;
    const { start, end, mid } = geo.range;
    const at = (angle: number): Position =>
      arcLocalToWorld(rect, geo.centerOffset, arcEndPoint([0, 0], radius, angle));
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
  *emit (rect: Rect, style, round, params: ArcParams): Iterable<ScenePrimitive> {
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
      fill: close ? (style.fill ?? 'transparent') : 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
    };
  },
  scaleParams: (params: ArcParams, sx: number, sy: number): ArcParams => ({
    ...params,
    radius: params.radius * Math.sqrt(sx * sy),
  }),
});
