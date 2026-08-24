import type { Position } from '@retikz/math';
import type { infer as ZodInfer } from 'zod';

import { NonNegativeNumberSchema, PositiveNumberSchema } from '@retikz/foundation';
import { number, strictObject } from 'zod';

import type { ScenePrimitive, ShapeAnchorName } from '../../contract';
import type { ContourSegment, Rect } from '../../shared';

import { contourToPathCommands, contourToPathPrimitive, defineShape, verticesToSegments } from '../../contract';
import { BuiltinShape } from '../../schemas';
import {
  boundaryFromContour,
  CenterAnchor,
  contourCommands,
  DEG_TO_RAD,
  isDirectionalAnchor,
  localToWorld,
  pointsConnectionEnvelope,
  rect,
} from '../../shared';

const MAX_POLYGON_SIDES = 1024;

const polygonParamsSchema = strictObject({
  sides: number()
    .int()
    .min(3)
    .max(MAX_POLYGON_SIDES)
    .describe(`Number of sides of the regular polygon (3..${MAX_POLYGON_SIDES}).`),
  rotate: number()
    .optional()
    .describe('Shape self-rotation in degrees (vertex start direction); default 0. Composes with Node.rotate.'),
  cornerRadius: NonNegativeNumberSchema.optional().describe(
    'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
  ),
  aspectRatio: PositiveNumberSchema.optional().describe(
    'Width-to-height ratio for a four-sided diamond; omitted for regular polygon geometry.',
  ),
}).superRefine((params, context) => {
  if (params.aspectRatio === undefined) return;
  if (params.sides !== 4) {
    context.addIssue({
      code: 'custom',
      path: ['aspectRatio'],
      message: 'aspectRatio is only supported for four-sided diamonds.',
    });
  }
  if (params.rotate !== undefined && params.rotate !== 0) {
    context.addIssue({
      code: 'custom',
      path: ['aspectRatio'],
      message: 'aspectRatio diamonds do not support a non-zero rotate parameter.',
    });
  }
});

type PolygonParams = ZodInfer<typeof polygonParamsSchema>;

/** 顶点角集合（度）：第 k 个顶点角 = rotate + k·(360/sides) */
const vertexAngles = (params: PolygonParams): Array<number> => {
  const startDeg = params.rotate ?? 0;
  const stepDeg = 360 / params.sides;
  const out: Array<number> = [];
  for (let k = 0; k < params.sides; k++) out.push(startDeg + k * stepDeg);
  return out;
};

/** 顶点角的 |cos| 最大值，用于由 AABB 半宽反推外接半径 */
const maxAbsCos = (params: PolygonParams): number => {
  let max = 0;
  for (const angle of vertexAngles(params)) {
    const value = Math.abs(Math.cos(angle * DEG_TO_RAD));
    if (value > max) max = value;
  }
  return max;
};

/**
 * 计算能容纳内框的正多边形外接圆半径
 * @description polygon 是文本容器 shape，尺寸由内框推导而不是由 params 直接指定
 */
const circumradiusFor = (hw: number, hh: number, params: PolygonParams): number => {
  const { sides } = params;
  const startDeg = params.rotate ?? 0;
  const stepDeg = 360 / sides;
  const apothemFactor = Math.cos(Math.PI / sides);
  let maxSupport = 0;
  for (let j = 0; j < sides; j++) {
    const phi = (startDeg + (j + 0.5) * stepDeg) * DEG_TO_RAD;
    const support = hw * Math.abs(Math.cos(phi)) + hh * Math.abs(Math.sin(phi));
    if (support > maxSupport) maxSupport = support;
  }
  return maxSupport / apothemFactor;
};

/** 由外接 AABB（emit / boundaryPoint 收到的 rect）反推外接圆半径：R = halfWidth / max|cosθ_k| */
const circumradiusFromRect = (bounds: Rect, params: PolygonParams): number => bounds.width / 2 / maxAbsCos(params);

/** 由内框计算扁菱形的两条半对角线，保证整个内框落在菱形内 */
const diamondHalfAxesFor = (hw: number, hh: number, aspectRatio: number): { halfWidth: number; halfHeight: number } => {
  const halfHeight = hw / aspectRatio + hh;
  return { halfWidth: aspectRatio * halfHeight, halfHeight };
};

/** 判断 polygon 参数是否使用扁菱形几何 */
const isAspectRatioDiamond = (params: PolygonParams): params is PolygonParams & { aspectRatio: number } =>
  params.sides === 4 && params.aspectRatio !== undefined;

/**
 * 正多边形顶点的世界坐标
 * @description 顶点均布在外接圆上，按 params.rotate 自旋
 */
const polygonLocalVertices = (radius: number, params: PolygonParams): Array<Position> =>
  vertexAngles(params).map(deg => {
    const a = deg * DEG_TO_RAD;
    return [radius * Math.cos(a), radius * Math.sin(a)];
  });

/** 从 shape AABB 得到 polygon 的局部顶点；扁菱形使用两条独立半对角线 */
const polygonLocalVerticesForBounds = (bounds: Rect, params: PolygonParams): Array<Position> => {
  if (isAspectRatioDiamond(params)) {
    const halfWidth = bounds.width / 2;
    const halfHeight = bounds.height / 2;
    return [
      [halfWidth, 0],
      [0, halfHeight],
      [-halfWidth, 0],
      [0, -halfHeight],
    ];
  }
  return polygonLocalVertices(circumradiusFromRect(bounds, params), params);
};

/** 正多边形顶点的世界坐标 */
const polygonVertices = (bounds: Rect, params: PolygonParams): Array<Position> =>
  polygonLocalVerticesForBounds(bounds, params).map(point => localToWorld(bounds, point));

/**
 * polygon 注册项：正多边形文本容器
 * @description sides/rotate 决定顶点环，cornerRadius 做顶点倒角；四边形可用 aspectRatio 生成扁菱形；命名 anchor 走外接 AABB。
 *   scaleParams 只缩 cornerRadius，不缩 sides / rotate。diamond 由 compile 解析为 polygon preset
 */
export const polygon = defineShape<PolygonParams>({
  name: BuiltinShape.Polygon,
  paramsSchema: polygonParamsSchema,
  circumscribe: (hw, hh, params) => {
    if (isAspectRatioDiamond(params)) return diamondHalfAxesFor(hw, hh, params.aspectRatio);
    const radius = circumradiusFor(hw, hh, params);
    const angles = vertexAngles(params);
    let halfWidth = 0;
    let halfHeight = 0;
    for (const angle of angles) {
      const rad = angle * DEG_TO_RAD;
      halfWidth = Math.max(halfWidth, Math.abs(radius * Math.cos(rad)));
      halfHeight = Math.max(halfHeight, Math.abs(radius * Math.sin(rad)));
    }
    return { halfWidth, halfHeight };
  },
  boundaryPoint: (bounds: Rect, toward: Position, params): Position => {
    // 带 rotate 的 rect 下取世界系顶点环；rayOrigin = 几何中心（= rect 中心 = node position）
    const verts = polygonVertices(bounds, params);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = [bounds.x, bounds.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (bounds: Rect, name: ShapeAnchorName): Position | undefined => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(bounds, name) : undefined;
  },
  connectionEnvelope: (bounds, kind, params) => {
    return pointsConnectionEnvelope(polygonLocalVerticesForBounds(bounds, params), kind);
  },
  *emit(bounds: Rect, style, round, params): Iterable<ScenePrimitive> {
    // emit 收轴对齐 rect（rotate=0）；顶点世界坐标 → 折线段 → rounded-contour 命令 → path
    const verts = polygonVertices(bounds, params);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const commands = contourToPathCommands(contourCommands(segments, params.cornerRadius), round);
    yield contourToPathPrimitive(commands, style);
  },
  // sides 计数 / rotate 角度不缩（默认深缩会缩坏 sides）；cornerRadius 是长度，随 node scale 用几何均值因子缩。
  scaleParams: (params, sx: number, sy: number) =>
    params.cornerRadius === undefined ? params : { ...params, cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) },
});
