import { z } from 'zod';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import type { ScenePrimitive } from '../primitive';
import { defineShape } from './define';

/**
 * contour shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；points = 闭合局部系顶点环（任意原点，
 *   core 按其 AABB 中心自动居中、Node position 对齐几何中心，≥3，隐式闭合，段间直线），
 *   cornerRadius = 逐顶点统一 fillet 半径（user units，可选，逐角夹紧）。
 */
type ContourParams = {
  points: Array<Position>;
  cornerRadius?: number;
};

export type { ContourParams };

/**
 * contour 注册项：吃任意闭合顶点环的几何驱动 shape（可圆角、可连接 Node）
 * @description per-instance params 给一圈局部系顶点（任意原点）+ 可选 cornerRadius；core 按顶点 AABB 中心
 *   自动归一化（每顶点减 AABB 中心再 localToWorld），Node position = 轮廓几何中心，circumscribeOffset 维持 [0,0]。
 *   emit / boundaryPoint / 圆角全部委托现有 geometry/contour.ts + shapes/contour.ts helper（与 polygon 同一条
 *   实现路径，仅顶点来源不同：polygon 由 rect+sides 推导，contour 直接取 params.points）。命名 anchor 返回
 *   undefined → compile 回退外接 AABB rect；boundaryPoint（指向式）精确命中轮廓。scaleParams：points 是长度
 *   按轴各向异性缩，cornerRadius 是长度按几何均值因子缩（同 polygon）。
 *
 *   NOTE: 当前为 ADR-03 spec 阶段的 STUB 实现——仅满足类型与 schema，真实几何（自动居中 / emit /
 *   boundaryPoint / fillet）由后续 implement 阶段委托轮廓引擎落地。
 */
export const contour = defineShape({
  paramsSchema: z.strictObject({
    points: z
      .array(z.tuple([z.number().finite(), z.number().finite()]))
      .min(3)
      .describe(
        "Closed local-frame vertex ring (any local origin — core auto-centers on the points' AABB center so Node position aligns to the geometric center; no caller pre-centering needed), >=3 points; edges are straight lines, last point auto-connects to first.",
      ),
    cornerRadius: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe(
        'Uniform per-vertex fillet radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  }),
  circumscribe: (innerHalfWidth, innerHalfHeight, params: ContourParams) => {
    void innerHalfWidth;
    void innerHalfHeight;
    void params;
    return { halfWidth: 0, halfHeight: 0 };
  },
  circumscribeOffset: (params: ContourParams): Position => {
    void params;
    return [0, 0];
  },
  boundaryPoint: (rect: Rect, toward: Position, params: ContourParams): Position => {
    void rect;
    void toward;
    void params;
    throw new Error('contour not implemented');
  },
  anchor: (rect: Rect, name: string, params: ContourParams): Position | undefined => {
    void rect;
    void name;
    void params;
    return undefined;
  },
  *emit (rect: Rect, style, round, params: ContourParams): Iterable<ScenePrimitive> {
    void rect;
    void style;
    void round;
    void params;
    if (false as boolean) yield undefined as never;
    throw new Error('contour not implemented');
  },
  scaleParams: (params: ContourParams, sx: number, sy: number): ContourParams => {
    void sx;
    void sy;
    return params;
  },
});
