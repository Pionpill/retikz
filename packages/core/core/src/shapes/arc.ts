import { z } from 'zod';
import type { ScenePrimitive } from '../primitive';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import { defineShape } from './define';

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

/**
 * arc 注册项：单半径曲线（描边、可选闭合为弓形）
 * @description 几何四函数（circumscribe / boundaryPoint / anchor / emit）此刻为占位 stub，
 *   实现 Agent 据角度约定（0°=+x, 90°=+y screen y-down）填真实数学；本文件锁定 paramsSchema。
 *   scaleParams：node scale 只缩 radius、不缩角度（angle 是方向不是长度）。
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
  // ── 几何占位 stub（实现 Agent 填真实数学）──────────────────────────────
  circumscribe: (_hw, _hh, params: ArcParams) => ({
    halfWidth: params.radius,
    halfHeight: params.radius,
  }),
  boundaryPoint: (rect: Rect): Position => [rect.x, rect.y],
  anchor: (rect: Rect, name: string): Position | undefined =>
    name === 'center' ? [rect.x, rect.y] : undefined,
  emit: (): Iterable<ScenePrimitive> => {
    throw new Error('arc.emit not implemented');
  },
  scaleParams: (params: ArcParams, sx: number, sy: number): ArcParams => ({
    ...params,
    radius: params.radius * Math.sqrt(sx * sy),
  }),
});
