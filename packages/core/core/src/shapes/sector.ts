import { z } from 'zod';
import type { ScenePrimitive } from '../primitive';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import { defineShape } from './define';

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

/**
 * sector 注册项：环楔（内外半径 + 起止角围成的可填充 2D 区域）
 * @description 几何四函数（circumscribe / boundaryPoint / anchor / emit）此刻为占位 stub，
 *   实现 Agent 据角度约定（0°=+x, 90°=+y screen y-down）填真实数学：circumscribe 返回含弧
 *   轴向极值（跨 90°·k 处 outerRadius 极值点）的精确 AABB 半轴、position=AABB 中心；anchor 含
 *   apex（圆心）/ centroid / inner-arc-mid / outer-arc-mid / start-edge-mid / end-edge-mid；
 *   emit 出外弧 + 径向边 + 内弧闭合 path（复用 core path 弧能力）。本文件锁定 paramsSchema。
 *   scaleParams：node scale 只缩半径（inner/outerRadius）、不缩角度（angle 是方向不是长度）。
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
  }),
  // ── 几何占位 stub（实现 Agent 填真实数学）──────────────────────────────
  circumscribe: (_hw, _hh, params: SectorParams) => ({
    halfWidth: params.outerRadius,
    halfHeight: params.outerRadius,
  }),
  boundaryPoint: (rect: Rect): Position => [rect.x, rect.y],
  anchor: (rect: Rect, name: string): Position | undefined =>
    name === 'centroid' ? [rect.x, rect.y] : undefined,
  emit: (): Iterable<ScenePrimitive> => {
    throw new Error('sector.emit not implemented');
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
