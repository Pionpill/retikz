import { z } from 'zod';
import { localToWorld } from '../geometry/transform';
import type { Position } from '../geometry/point';
import { normalizeCompassAnchor } from '../geometry/anchor';
import { rect as rectOps } from '../geometry/rect';
import type { Rect } from '../geometry/rect';
import {
  type ContourSegment,
  boundaryFromContour,
  contourCommands,
} from '../geometry/contour';
import type { ScenePrimitive } from '../primitive';
import { contourToPathCommands, verticesToSegments } from './contour';
import { defineShape } from './define';

/**
 * polygon shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；sides = 边数（≥3），rotate = 起始顶点自旋角（度，可选），
 *   cornerRadius = 顶点倒角半径（user units，可选，逐角夹紧）。
 *   diamond 收敛为此 shape 的 `{ sides: 4, rotate: 0 }` preset 别名。
 */
type PolygonParams = {
  sides: number;
  rotate?: number;
  cornerRadius?: number;
};

const DEG_TO_RAD = Math.PI / 180;
const MAX_POLYGON_SIDES = 1024;

/** 顶点角集合（度）：第 k 个顶点角 = rotate + k·(360/sides) */
const vertexAngles = (params: PolygonParams): Array<number> => {
  const startDeg = params.rotate ?? 0;
  const stepDeg = 360 / params.sides;
  const out: Array<number> = [];
  for (let k = 0; k < params.sides; k++) out.push(startDeg + k * stepDeg);
  return out;
};

/** 顶点角的 |cos| 最大值（恒 >0，sides≥3 时至少一个顶点不在 ±y 轴上）；用于由 AABB 半宽反推外接半径 */
const maxAbsCos = (params: PolygonParams): number => {
  let max = 0;
  for (const angle of vertexAngles(params)) {
    const value = Math.abs(Math.cos(angle * DEG_TO_RAD));
    if (value > max) max = value;
  }
  return max;
};

/**
 * 能容纳内框（半轴 hw/hh）的正 sides 边形外接圆半径
 * @description rectangle / polygon 是文本容器——尺寸由内框（text + padding）驱动，circumscribe 从内框推外接。
 *   正多边形 = 各边内法向投影 ≤ 内切半径(apothem) 的半平面交；apothem = R·cos(π/sides)。内框 4 角
 *   (±hw,±hh) 全在多边形内 ⇔ 对每条边法向 φ_j，max 角投影 hw·|cosφ_j|+hh·|sinφ_j| ≤ apothem。
 *   取使等号成立的最小 R = max_j(hw·|cosφ_j|+hh·|sinφ_j|) / cos(π/sides)，φ_j = rotate+(j+0.5)·(360/sides)。
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
const circumradiusFromRect = (rect: Rect, params: PolygonParams): number =>
  (rect.width / 2) / maxAbsCos(params);

/**
 * 正多边形 `sides` 个顶点的世界坐标（外接圆半径 radius、起始角 rotate、绕 rect 中心）
 * @description 顶点均布外接圆：第 k 个顶点角 = rotate + k·(360/sides)；点在 rect 局部系算后经 localToWorld 投世界。
 *   emit / boundaryPoint / anchor 共用此真源。
 */
const polygonVertices = (rect: Rect, radius: number, params: PolygonParams): Array<Position> =>
  vertexAngles(params).map(deg => {
    const a = deg * DEG_TO_RAD;
    return localToWorld(rect, [radius * Math.cos(a), radius * Math.sin(a)]);
  });

/**
 * polygon 注册项：正多边形（sides 顶点均布外接圆，rotate 定起始角，cornerRadius 顶点倒角）
 * @description 文本容器形状——circumscribe 从内框 `innerHalfWidth/Height` 推能容纳内框的外接圆、再取其 AABB 半轴，
 *   尺寸仍由内框 + minimumSize 驱动（区别于 sector / star 的 params-半径驱动）。emit / boundaryPoint 把顶点环构造成
 *   `sides` 条折线段，委托 rounded-contour 模块：cornerRadius 省略 / 0 出原尖角轮廓、>0 在每个顶点插逐角夹紧的
 *   fillet 弧。emit 收轴对齐 rect（旋转由外层 group 施加）、boundaryPoint 收带 rotate 的 rect 且 rayOrigin = 几何中心
 *   （多边形关于中心对称，AABB 中心 = 形心 = node position）。命名 anchor 走外接 AABB 的 9 名 rect anchor（不随
 *   cornerRadius 移）；self-rotate（params.rotate）与 Node.rotate 叠加。scaleParams：cornerRadius 是长度随 scale
 *   缩（几何均值因子），sides 计数 / rotate 角度不缩。
 *   diamond ≡ `{ type: 'polygon', params: { sides: 4, rotate: 0 } }`，由 compile 规范化。
 */
export const polygon = defineShape({
  paramsSchema: z.strictObject({
    sides: z
      .number()
      .int()
      .min(3)
      .max(MAX_POLYGON_SIDES)
      .describe(`Number of sides of the regular polygon (3..${MAX_POLYGON_SIDES}).`),
    rotate: z
      .number()
      .finite()
      .optional()
      .describe('Shape self-rotation in degrees (vertex start direction); default 0. Composes with Node.rotate.'),
    cornerRadius: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe(
        'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  }),
  circumscribe: (hw, hh, params: PolygonParams) => {
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
  boundaryPoint: (rect: Rect, toward: Position, params: PolygonParams): Position => {
    const radius = circumradiusFromRect(rect, params);
    // 带 rotate 的 rect 下取世界系顶点环；rayOrigin = 几何中心（= rect 中心 = node position）
    const verts = polygonVertices(rect, radius, params);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = [rect.x, rect.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (rect: Rect, name: string, params: PolygonParams): Position | undefined => {
    void params;
    const a = normalizeCompassAnchor(name);
    return a ? rectOps.anchor(rect, a) : undefined;
  },
  *emit (rect: Rect, style, round, params: PolygonParams): Iterable<ScenePrimitive> {
    const radius = circumradiusFromRect(rect, params);
    // emit 收轴对齐 rect（rotate=0）；顶点世界坐标 → 折线段 → rounded-contour 命令 → path
    const verts = polygonVertices(rect, radius, params);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
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
  // sides 计数 / rotate 角度不缩（默认深缩会缩坏 sides）；cornerRadius 是长度，随 node scale 用几何均值因子缩。
  scaleParams: (params: PolygonParams, sx: number, sy: number): PolygonParams =>
    params.cornerRadius === undefined
      ? params
      : { ...params, cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) },
});
