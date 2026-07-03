import type { Position } from '@retikz/math';

import { z } from 'zod';

import type { ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { ContourSegment, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { boundaryFromContour, contourCommands, localToWorld, point } from '../../shared';
import { contourToPathCommands, contourToPathPrimitive, verticesToSegments } from './outline';

/**
 * contour shape 的 per-instance params 类型
 * @description 与 paramsSchema 保持同形，供 definition 内部拿到强类型 params。
 */
export type ContourParams = {
  /**
   * 闭合局部系顶点环。
   * @description 任意原点；core 按其 AABB 中心自动居中，Node position 对齐几何中心。
   *   至少 3 个点，隐式闭合，段间直线。
   */
  points: Array<Position>;
  /**
   * 逐顶点统一 fillet 半径。
   * @default 0
   */
  cornerRadius?: number;
};

/** 点集 AABB 范围。 */
type ContourAabb = {
  /** 最小 x 坐标。 */
  minX: number;
  /** 最小 y 坐标。 */
  minY: number;
  /** 最大 x 坐标。 */
  maxX: number;
  /** 最大 y 坐标。 */
  maxY: number;
};

/** 点集 AABB。 */
const aabbOf = (points: Array<Position>): ContourAabb => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { maxX, maxY, minX, minY };
};

/** 点集 AABB 中心；core 据此自动居中（每顶点减去它，使几何中心落到 Node position） */
const aabbCenterOf = (points: Array<Position>): Position => {
  const { maxX, maxY, minX, minY } = aabbOf(points);
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

/** 顶点环 → 自动居中（减 AABB 中心）→ 经 rect 投世界系 → 闭合折线段 */
const worldSegments = (rect: Rect, params: ContourParams): Array<ContourSegment> => {
  const center = aabbCenterOf(params.points);
  const verts = params.points.map(p => localToWorld(rect, point.sub(p, center)));
  return verticesToSegments(verts);
};

/**
 * contour 注册项：吃任意闭合顶点环的几何驱动 shape（可圆角、可连接 Node）
 * @description per-instance params 给一圈局部系顶点（任意原点）+ 可选 cornerRadius；core 按顶点 AABB 中心
 *   自动归一化（每顶点减 AABB 中心再 localToWorld），Node position = 轮廓几何中心，circumscribeOffset 维持 [0,0]。
 *   emit / boundaryPoint / 圆角全部委托 shared/geometry contour helper + shapes/contour.ts helper（与 polygon 同一条
 *   实现路径，仅顶点来源不同：polygon 由 rect+sides 推导，contour 直接取 params.points）。命名 anchor 返回
 *   undefined → compile 回退外接 AABB rect；boundaryPoint（指向式）精确命中轮廓。scaleParams：points 是长度
 *   按轴各向异性缩，cornerRadius 是长度按几何均值因子缩（同 polygon）。
 */
export const contour = defineShape({
  name: 'contour',
  paramsSchema: z.strictObject({
    points: z
      .array(z.tuple([z.number(), z.number()]))
      .min(3)
      .describe(
        "Closed local-frame vertex ring (any local origin — core auto-centers on the points' AABB center so Node position aligns to the geometric center; no caller pre-centering needed), >=3 points; edges are straight lines, last point auto-connects to first.",
      ),
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Uniform per-vertex fillet radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  }),
  // 几何驱动：AABB 半轴由 points 算（平移不变，自动居中无需调用方预居中）；rect 中心维持在 position。
  circumscribe: (innerHalfWidth, innerHalfHeight, params: ContourParams) => {
    void innerHalfWidth;
    void innerHalfHeight;
    const { maxX, maxY, minX, minY } = aabbOf(params.points);
    return { halfWidth: (maxX - minX) / 2, halfHeight: (maxY - minY) / 2 };
  },
  // 自动居中收在 emit / boundaryPoint 内部（减 AABB 中心），rect 仍中心在 position。
  circumscribeOffset: (params: ContourParams): Position => {
    void params;
    return [0, 0];
  },
  boundaryPoint: (rect: Rect, toward: Position, params: ContourParams): Position => {
    const segments = worldSegments(rect, params);
    const center: Position = [rect.x, rect.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  // 标准方位名交回退（compile 回退到外接 AABB rect）；曲边块上没有有意义的真·命名方位。
  anchor: (rect: Rect, name: ShapeAnchorName, params: ContourParams): Position | undefined => {
    void rect;
    void name;
    void params;
    return undefined;
  },
  *emit(rect: Rect, style, round, params: ContourParams): Iterable<ScenePrimitive> {
    const segments = worldSegments(rect, params);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);
    yield contourToPathPrimitive(commands, style);
  },
  // points 是长度（按轴各向异性缩）；cornerRadius 是长度（几何均值因子，同 polygon）。
  scaleParams: (params: ContourParams, sx: number, sy: number): ContourParams => ({
    points: params.points.map(([x, y]): Position => [x * sx, y * sy]),
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) }),
  }),
});
