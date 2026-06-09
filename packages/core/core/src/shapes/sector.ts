import { z } from 'zod';
import { localToWorld } from '../geometry/_transform';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import {
  type ContourSegment,
  boundaryFromContour,
  contourCommands,
} from '../geometry/contour';
import type { ScenePrimitive } from '../primitive';
import { contourToPathCommands } from './_contour';
import { defineShape } from './define';
import { type SectorGeometry, sectorGeometry, sectorPolarPoint } from './_shared';

/**
 * sector shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；内外半径 + 起止角 + 可选倒角半径。
 *   innerRadius=0 退化为实心扇片（pie slice）；outerRadius 必须 > innerRadius；
 *   cornerRadius 给四个接缝（环楔的 4 个 line-arc / pie 的 apex line-line + 2 line-arc）逐角夹紧倒角。
 */
type SectorParams = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  cornerRadius?: number;
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
 * 构造 sector 闭合轮廓的有序段序列（line + arc），段序与现状 emit 完全一致
 * @description 环楔（innerRadius>0）4 段闭环：radial Line(inner-start→outer-start) → outer Arc(start→end, CW)
 *   → radial Line(outer-end→inner-end) → inner Arc(end→start, CCW)。pie（innerRadius=0）3 段闭环：
 *   radial Line(apex→outer-start) → outer Arc(start→end, CW) → radial Line(outer-end→apex)，apex 处为 line-line 接缝。
 *   Arc 圆心 = apex 世界坐标、半径 = inner/outer radius、起止角与现状 emit 同（度，CW 即 counterClockwise=false）。
 *   emit / boundaryPoint 共用此真源；emit 收轴对齐 rect、boundaryPoint 收带 rotate 的 rect，rect 不同自然投不同世界系。
 */
const sectorSegments = (rect: Rect, geo: SectorGeometry, params: SectorParams): Array<ContourSegment> => {
  const { innerRadius, outerRadius } = params;
  const { start, end } = geo.range;
  const apex = toWorld(rect, geo, [0, 0]);
  // arc 角度走「圆心局部极角」约定；rect 旋转（弧度）下世界系极角整体加 rotate（度），与端点 toWorld 自洽。
  //   emit 收 rect.rotate=0（外层 group 施旋转）→ 偏移 0、角度逐字同现状；boundaryPoint 收带 rotate 的 rect。
  const rotateDeg = ((rect.rotate ?? 0) * 180) / Math.PI;
  const sa = start + rotateDeg;
  const ea = end + rotateDeg;
  const outerStart = toWorld(rect, geo, sectorPolarPoint(outerRadius, start));
  if (innerRadius > 0) {
    const innerStart = toWorld(rect, geo, sectorPolarPoint(innerRadius, start));
    const innerEnd = toWorld(rect, geo, sectorPolarPoint(innerRadius, end));
    return [
      { kind: 'line', from: innerStart, to: outerStart },
      { kind: 'arc', center: apex, radius: outerRadius, startAngle: sa, endAngle: ea },
      { kind: 'line', from: toWorld(rect, geo, sectorPolarPoint(outerRadius, end)), to: innerEnd },
      { kind: 'arc', center: apex, radius: innerRadius, startAngle: ea, endAngle: sa, counterClockwise: true },
    ];
  }
  // pie：apex → outer-start（径向）→ 外弧 → outer-end → apex（径向），apex 处 line-line 接缝
  return [
    { kind: 'line', from: apex, to: outerStart },
    { kind: 'arc', center: apex, radius: outerRadius, startAngle: sa, endAngle: ea },
    { kind: 'line', from: toWorld(rect, geo, sectorPolarPoint(outerRadius, end)), to: apex },
  ];
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
    cornerRadius: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe(
        'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
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
    // rayOrigin = 质心（非圆心）：sector 圆心在轮廓边角上，质心才落在环楔内、向外射线必穿轮廓一次。
    const centroidWorld = localToWorld(rect, geo.centroidOffset);
    const segments = sectorSegments(rect, geo, params);
    const hit = boundaryFromContour(segments, params.cornerRadius, centroidWorld, toward);
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
    // 轮廓段（emit 收轴对齐 rect，rotate 由外层 group 施加）→ rounded-contour 命令 → path
    const segments = sectorSegments(rect, geo, params);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);

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
  // 半径 / cornerRadius 是长度，随几何均值因子缩；角度是方向，不缩。
  scaleParams: (params: SectorParams, sx: number, sy: number): SectorParams => {
    const factor = Math.sqrt(sx * sy);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
      ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * factor }),
    };
  },
});
