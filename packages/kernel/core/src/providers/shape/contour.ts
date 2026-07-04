import type { Position } from '@retikz/math';

import { boundsCenter, boundsHalfAxes, boundsOf } from '@retikz/math';
import { z } from 'zod';

import type { ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { ContourSegment, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { boundaryFromContour, contourCommands, localToWorld, point } from '../../shared';
import { contourToPathCommands, contourToPathPrimitive, verticesToSegments } from './outline';

const contourParamsSchema = z.strictObject({
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
});

export type ContourParams = z.infer<typeof contourParamsSchema>;

/** 点集 AABB 中心，用于把任意原点的顶点环居中到 Node position。 */
const aabbCenterOf = (points: Array<Position>): Position => {
  const bounds = boundsOf(points);
  if (bounds === undefined) throw new Error('contour: points must contain at least one vertex.');
  return boundsCenter(bounds);
};

/** 顶点环居中后投到世界系，生成闭合折线段。 */
const worldSegments = (rect: Rect, params: ContourParams): Array<ContourSegment> => {
  const center = aabbCenterOf(params.points);
  const verts = params.points.map(p => localToWorld(rect, point.sub(p, center)));
  return verticesToSegments(verts);
};

/**
 * contour 注册项：任意闭合顶点环。
 * @description 顶点按 AABB 中心自动归一化，Node position 对齐轮廓中心；命名 anchor 交给外接 AABB 回退。
 *   points 按轴缩放，cornerRadius 按几何均值缩放。
 */
export const contour = defineShape<ContourParams>({
  name: 'contour',
  paramsSchema: contourParamsSchema,
  // 几何驱动：AABB 半轴由 points 算（平移不变，自动居中无需调用方预居中）；rect 中心维持在 position。
  circumscribe: (innerHalfWidth, innerHalfHeight, params) => {
    void innerHalfWidth;
    void innerHalfHeight;
    const bounds = boundsOf(params.points);
    if (bounds === undefined) throw new Error('contour: points must contain at least one vertex.');
    return boundsHalfAxes(bounds);
  },
  // 自动居中收在 emit / boundaryPoint 内部（减 AABB 中心），rect 仍中心在 position。
  circumscribeOffset: (params): Position => {
    void params;
    return [0, 0];
  },
  boundaryPoint: (rect: Rect, toward: Position, params): Position => {
    const segments = worldSegments(rect, params);
    const center: Position = [rect.x, rect.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  // 标准方位名交回退（compile 回退到外接 AABB rect）；曲边块上没有有意义的真·命名方位。
  anchor: (rect: Rect, name: ShapeAnchorName, params): Position | undefined => {
    void rect;
    void name;
    void params;
    return undefined;
  },
  *emit(rect: Rect, style, round, params): Iterable<ScenePrimitive> {
    const segments = worldSegments(rect, params);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);
    yield contourToPathPrimitive(commands, style);
  },
  // points 是长度（按轴各向异性缩）；cornerRadius 是长度（几何均值因子，同 polygon）。
  scaleParams: (params, sx: number, sy: number) => ({
    points: params.points.map(([x, y]): Position => [x * sx, y * sy]),
    ...(params.cornerRadius === undefined ? {} : { cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) }),
  }),
});
