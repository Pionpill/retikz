import { z } from 'zod';
import { localToWorld, worldToLocal } from '../geometry/_transform';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import type { PathCommand, ScenePrimitive } from '../primitive';
import { defineShape } from './define';
import { type SectorGeometry, sectorGeometry, sectorPolarPoint } from './_shared';

/**
 * sector shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；内外半径 + 起止角。
 *   innerRadius=0 退化为实心扇片（pie slice）；outerRadius 必须 > innerRadius。
 */
type SectorParams = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

/** sector 局部 AABB 系点（圆心为原点偏移后）→ 世界系（含 rect 旋转 / 平移） */
const toWorld = (rect: Rect, geo: SectorGeometry, localFromApex: Position): Position => {
  // localFromApex 是「相对圆心」的局部点；先平移到「相对 AABB 中心」（加 apexOffset），再经 rect 投世界
  const fromAabbCenter: Position = [
    localFromApex[0] + geo.apexOffset[0],
    localFromApex[1] + geo.apexOffset[1],
  ];
  return localToWorld(rect, fromAabbCenter);
};

/**
 * sector 注册项：环楔（内外半径 + 起止角围成的可填充 2D 区域）
 * @description 四何函数共用 `sectorGeometry`（单一真源）：circumscribe 返回含圆心 + 内外弧的精确 AABB 半轴
 *   （含弧跨过 90°·k 轴向的 outerRadius 极值点），node position = AABB 中心；anchor 含 apex（圆心）/ centroid /
 *   inner-arc-mid / outer-arc-mid / start-edge-mid / end-edge-mid + 角度边界点；emit 出外弧 + 两径向边 + 内弧
 *   闭合 path（innerRadius=0 时径向边交于圆心、无内弧）。scaleParams 只缩半径、不缩角度。
 */
export const sector = defineShape({
  paramsSchema: z.strictObject({
    innerRadius: z
      .number()
      .finite()
      .nonnegative()
      .describe('Inner radius (user units); 0 = solid pie slice.'),
    outerRadius: z
      .number()
      .finite()
      .positive()
      .describe('Outer radius (user units); must be > innerRadius.'),
    startAngle: z
      .number()
      .finite()
      .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
    endAngle: z
      .number()
      .finite()
      .describe('End angle in degrees; swept counterclockwise in screen space from startAngle.'),
  })
    .refine(p => p.outerRadius > p.innerRadius, {
      message: 'outerRadius must be greater than innerRadius',
    }),
  circumscribe: (_hw, _hh, params: SectorParams) => sectorGeometry(params).aabbHalfAxes,
  // position = 圆心 apex；AABB 中心相对 apex 的偏移 = −apexOffset（apexOffset 是 apex 相对 AABB 中心）
  circumscribeOffset: (params: SectorParams): Position => {
    const { apexOffset } = sectorGeometry(params);
    return [-apexOffset[0], -apexOffset[1]];
  },
  boundaryPoint: (rect: Rect, toward: Position, params: SectorParams): Position => {
    const geo = sectorGeometry(params);
    // 从质心向 toward 射线，求与外弧 / 内弧 / 两径向边轮廓的最近交点
    const centroidWorld = localToWorld(rect, geo.centroidOffset);
    const hit = sectorBoundaryHit(rect, geo, params, centroidWorld, toward);
    return hit ?? centroidWorld;
  },
  anchor: (rect: Rect, name: string, params: SectorParams): Position | undefined => {
    const geo = sectorGeometry(params);
    const { innerRadius, outerRadius } = params;
    const { start, end, mid } = geo.range;
    switch (name) {
      case 'apex':
      case 'center':
        return toWorld(rect, geo, [0, 0]);
      case 'centroid':
        return localToWorld(rect, geo.centroidOffset);
      case 'outer-arc-mid':
        return toWorld(rect, geo, sectorPolarPoint(outerRadius, mid));
      case 'inner-arc-mid':
        return toWorld(rect, geo, sectorPolarPoint(innerRadius, mid));
      case 'start-edge-mid':
        return toWorld(rect, geo, sectorPolarPoint((innerRadius + outerRadius) / 2, start));
      case 'end-edge-mid':
        return toWorld(rect, geo, sectorPolarPoint((innerRadius + outerRadius) / 2, end));
      default:
        return undefined;
    }
  },
  *emit (rect: Rect, style, round, params: SectorParams): Iterable<ScenePrimitive> {
    const geo = sectorGeometry(params);
    const { innerRadius, outerRadius } = params;
    const { start, end } = geo.range;
    // 圆心世界坐标（emit 收轴对齐 rect，rotate 由外层 group 施加）
    const apex = toWorld(rect, geo, [0, 0]);
    const outerStart = toWorld(rect, geo, sectorPolarPoint(outerRadius, start));
    const outerCenter: Position = apex;

    const commands: Array<PathCommand> = [];
    const rp = (p: Position): [number, number] => [round(p[0]), round(p[1])];
    if (innerRadius > 0) {
      const innerStart = toWorld(rect, geo, sectorPolarPoint(innerRadius, start));
      // 内弧起点 → 外弧起点（径向边）→ 外弧 → 外弧终点 → 内弧终点（径向边）→ 内弧回起点
      commands.push({ kind: 'move', to: rp(innerStart) });
      commands.push({ kind: 'line', to: rp(outerStart) });
      commands.push({
        kind: 'arc',
        center: rp(outerCenter),
        radius: round(outerRadius),
        startAngle: start,
        endAngle: end,
      });
      const innerEnd = toWorld(rect, geo, sectorPolarPoint(innerRadius, end));
      commands.push({ kind: 'line', to: rp(innerEnd) });
      commands.push({
        kind: 'arc',
        center: rp(outerCenter),
        radius: round(innerRadius),
        startAngle: end,
        endAngle: start,
        counterClockwise: true,
      });
      commands.push({ kind: 'close' });
    } else {
      // pie slice：圆心 → 外弧起点 → 外弧 → 回圆心
      commands.push({ kind: 'move', to: rp(apex) });
      commands.push({ kind: 'line', to: rp(outerStart) });
      commands.push({
        kind: 'arc',
        center: rp(outerCenter),
        radius: round(outerRadius),
        startAngle: start,
        endAngle: end,
      });
      commands.push({ kind: 'close' });
    }

    yield {
      type: 'path',
      commands,
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
    };
  },
  scaleParams: (params: SectorParams, sx: number, sy: number): SectorParams => {
    const factor = Math.sqrt(sx * sy);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
    };
  },
});

/**
 * 从 origin 沿 toward 方向射线，求与 sector 轮廓（外弧 / 内弧 / 两径向边）的最近正向交点
 * @description 轮廓在「圆心局部系」求解：把 origin / toward 反投到局部、对四段分别求 ray∩段、取最小正 t；
 *   命中后投回世界系。无命中返回 undefined（调用方兜底质心）。
 */
const sectorBoundaryHit = (
  rect: Rect,
  geo: SectorGeometry,
  params: SectorParams,
  origin: Position,
  toward: Position,
): Position | undefined => {
  // 局部系：以圆心为原点。先把 origin / toward 转到「相对圆心」局部坐标。
  const { worldToLocalFromApex } = makeApexFrame(rect, geo);
  const o = worldToLocalFromApex(origin);
  const t = worldToLocalFromApex(toward);
  const dir: Position = [t[0] - o[0], t[1] - o[1]];
  const dl = Math.hypot(dir[0], dir[1]);
  if (dl < 1e-12) return undefined;
  const ux = dir[0] / dl;
  const uy = dir[1] / dl;
  const { innerRadius, outerRadius } = params;
  const { start, end } = geo.range;

  let best = Infinity;
  // 与圆（半径 R）相交：|o + s·u|² = R²
  const rayCircle = (R: number): Array<number> => {
    const b = 2 * (o[0] * ux + o[1] * uy);
    const c = o[0] * o[0] + o[1] * o[1] - R * R;
    const disc = b * b - 4 * c;
    if (disc < 0) return [];
    const sq = Math.sqrt(disc);
    return [(-b - sq) / 2, (-b + sq) / 2];
  };
  const angleInRange = (px: number, py: number): boolean => {
    const a0 = (Math.atan2(py, px) * 180) / Math.PI;
    // 把 atan2 角（[-180,180]）一次性抬到 ≥ start 的最小同余值（O(1)，巨型 start 下不退化 / 不死循环）
    const a = a0 + 360 * Math.max(0, Math.ceil((start - a0) / 360));
    return a <= end + 1e-9;
  };
  for (const R of innerRadius > 0 ? [innerRadius, outerRadius] : [outerRadius]) {
    for (const s of rayCircle(R)) {
      if (s <= 1e-9 || s >= best) continue;
      const px = o[0] + s * ux;
      const py = o[1] + s * uy;
      if (angleInRange(px, py)) best = s;
    }
  }
  // 与两径向边（角度 start / end，半径 q∈[inner,outer]）相交：o + s·u = q·(ex,ey)
  //   线性方程组 [ux, -ex; uy, -ey]·[s; q] = [-ox; -oy]，Cramer 求 s / q
  for (const ang of [start, end]) {
    const rad = (ang * Math.PI) / 180;
    const ex = Math.cos(rad);
    const ey = Math.sin(rad);
    const det = ux * -ey - -ex * uy; // ex·uy - ux·ey
    if (Math.abs(det) < 1e-12) continue;
    const s = (-o[0] * -ey - -ex * -o[1]) / det; // (-ox·-ey) - (-ex·-oy)
    const q = (ux * -o[1] - -o[0] * uy) / det;
    if (s <= 1e-9 || s >= best) continue;
    if (q >= innerRadius - 1e-9 && q <= outerRadius + 1e-9) best = s;
  }
  if (!Number.isFinite(best)) return undefined;
  const localHit: Position = [o[0] + best * ux, o[1] + best * uy];
  return localFromApexToWorld(rect, geo, localHit);
};

/** 圆心局部系 ↔ 世界系互转闭包（apexOffset 把「相对圆心」对齐到「相对 AABB 中心」） */
const makeApexFrame = (
  rect: Rect,
  geo: SectorGeometry,
): { worldToLocalFromApex: (w: Position) => Position } => ({
  worldToLocalFromApex: (w: Position): Position => {
    // 世界 → 相对 AABB 中心局部（逆 rect 变换）→ 减 apexOffset 得「相对圆心」
    const fromCenter = worldToLocal(rect, w);
    return [fromCenter[0] - geo.apexOffset[0], fromCenter[1] - geo.apexOffset[1]];
  },
});

/** 相对圆心局部点 → 世界（先 +apexOffset 到相对 AABB 中心，再 localToWorld） */
const localFromApexToWorld = (rect: Rect, geo: SectorGeometry, p: Position): Position =>
  localToWorld(rect, [p[0] + geo.apexOffset[0], p[1] + geo.apexOffset[1]]);
