import type { Position } from '@retikz/math';

import { z } from 'zod';

import type { ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { ContourSegment, FilletSolution, Rect } from '../../shared';
import type { SectorGeometry } from './sector-geometry';

import { defineShape } from '../../contract';
import { boundaryFromContour, contourCommands, filletContour, localToWorld, RAD_TO_DEG } from '../../shared';
import { contourToPathCommands, contourToPathPrimitive } from './outline';
import { sectorGeometry, sectorPolarPoint } from './sector-geometry';

/**
 * sector 参数 schema。
 * @description innerRadius=0 表示实心扇片；cornerRadius 对边界接缝倒角。
 */
const sectorParamsSchema = z
  .strictObject({
    innerRadius: z.number().nonnegative().describe('Inner radius (user units); 0 = solid pie slice.'),
    outerRadius: z.number().positive().describe('Outer radius (user units); must be > innerRadius.'),
    startAngle: z
      .number()
      .describe('Start angle in degrees; polar convention 0°=+x, 90°=+y (screen y-down), matching core polar.'),
    endAngle: z.number().describe('End angle in degrees; swept clockwise in screen space from startAngle.'),
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  })
  .refine(p => p.outerRadius > p.innerRadius, {
    message: 'outerRadius must be greater than innerRadius',
  });

type SectorParams = z.infer<typeof sectorParamsSchema>;

/** sector 局部 AABB 系点（圆心为原点偏移后）→ 世界系（含 rect 旋转 / 平移） */
const toWorld = (rect: Rect, geo: SectorGeometry, localFromApex: Position): Position => {
  // localFromApex 是「相对圆心」的局部点；先平移到「相对 AABB 中心」（加 apexOffset），再经 rect 投世界
  const fromAabbCenter: Position = [localFromApex[0] + geo.apexOffset[0], localFromApex[1] + geo.apexOffset[1]];
  return localToWorld(rect, fromAabbCenter);
};

/**
 * 构造 sector 闭合轮廓。
 * @description 环楔包含内外弧，实心扇片退化为圆心到外弧的闭合区域；emit / boundaryPoint 共用此段序。
 */
const sectorSegments = (rect: Rect, geo: SectorGeometry, params: SectorParams): Array<ContourSegment> => {
  const { innerRadius, outerRadius } = params;
  const { start, end } = geo.range;
  const apex = toWorld(rect, geo, [0, 0]);
  // arc 角度走「圆心局部极角」约定；rect 旋转（弧度）下世界系极角整体加 rotate（度），与端点 toWorld 自洽。
  //   emit 收 rect.rotate=0（外层 group 施旋转）→ 偏移 0、角度逐字同现状；boundaryPoint 收带 rotate 的 rect。
  const rotateDeg = (rect.rotate ?? 0) * RAD_TO_DEG;
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

const createSectorContour = (
  rect: Rect,
  params: SectorParams,
): {
  geo: SectorGeometry;
  segments: Array<ContourSegment>;
  fillets: Array<FilletSolution>;
} => {
  const geo = sectorGeometry(params);
  const segments = sectorSegments(rect, geo, params);
  return {
    geo,
    segments,
    fillets: filletContour(segments, params.cornerRadius),
  };
};

/**
 * sector 注册项：可填充的环楔 / 扇片。
 * @description 几何由内外半径和起止角驱动；提供圆心、质心、弧中点和边中点 anchor。
 *   scaleParams 只缩半径和倒角，不缩角度。
 */
export const sector = defineShape<SectorParams>({
  name: 'sector',
  paramsSchema: sectorParamsSchema,
  circumscribe: (_hw, _hh, params) => sectorGeometry(params).aabbHalfAxes,
  // position = 圆心 apex；AABB 中心相对 apex 的偏移 = −apexOffset（apexOffset 是 apex 相对 AABB 中心）
  circumscribeOffset: (params): Position => {
    const { apexOffset } = sectorGeometry(params);
    return [-apexOffset[0], -apexOffset[1]];
  },
  boundaryPoint: (rect: Rect, toward: Position, params): Position => {
    const { geo, segments, fillets } = createSectorContour(rect, params);
    // rayOrigin 必须落在填充区域内；环形扇区的质心可能落入内孔。
    const originWorld = localToWorld(rect, geo.boundaryOriginOffset);
    const hit = boundaryFromContour(segments, params.cornerRadius, originWorld, toward, fillets);
    return hit ?? originWorld;
  },
  anchor: (rect: Rect, name: ShapeAnchorName, params): Position | undefined => {
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
  *emit(rect: Rect, style, round, params): Iterable<ScenePrimitive> {
    // 轮廓段（emit 收轴对齐 rect，rotate 由外层 group 施加）→ rounded-contour 命令 → path
    const { segments, fillets } = createSectorContour(rect, params);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius, fillets), round);
    const path = contourToPathPrimitive(commands, style);
    if (params.innerRadius > 0) path.fillRule = 'evenodd';
    yield path;
  },
  // 半径 / cornerRadius 是长度，随几何均值因子缩；角度是方向，不缩。
  scaleParams: (params, sx: number, sy: number) => {
    const factor = Math.sqrt(sx * sy);
    return {
      ...params,
      innerRadius: params.innerRadius * factor,
      outerRadius: params.outerRadius * factor,
      ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * factor }),
    };
  },
});
