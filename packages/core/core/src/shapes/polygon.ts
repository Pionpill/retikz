import { z } from 'zod';
import { localToWorld, worldToLocal } from '../geometry/_transform';
import type { Position } from '../geometry/point';
import { rect as rectOps } from '../geometry/rect';
import type { Rect } from '../geometry/rect';
import type { PathCommand, ScenePrimitive } from '../primitive';
import { asRectAnchor } from './_shared';
import { defineShape } from './define';

/**
 * polygon shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；sides = 边数（≥3），rotate = 起始顶点自旋角（度，可选）。
 *   diamond 收敛为此 shape 的 `{ sides: 4, rotate: 45 }` preset 别名。
 */
type PolygonParams = {
  sides: number;
  rotate?: number;
};

const DEG_TO_RAD = Math.PI / 180;

/** 顶点角集合（度）：第 k 个顶点角 = rotate + k·(360/sides) */
const vertexAngles = (params: PolygonParams): Array<number> => {
  const startDeg = params.rotate ?? 0;
  const stepDeg = 360 / params.sides;
  const out: Array<number> = [];
  for (let k = 0; k < params.sides; k++) out.push(startDeg + k * stepDeg);
  return out;
};

/** 顶点角的 |cos| 最大值（恒 >0，sides≥3 时至少一个顶点不在 ±y 轴上）；用于由 AABB 半宽反推外接半径 */
const maxAbsCos = (params: PolygonParams): number =>
  Math.max(...vertexAngles(params).map(a => Math.abs(Math.cos(a * DEG_TO_RAD))));

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
 * 从中心向 toward 射线与正多边形某条边的最近正向交点（局部系求解后投回世界）
 * @description 局部顶点环在外接圆半径 radius 上；对每条相邻顶点边 [v_i, v_{i+1}] 求 ray(o,dir)∩segment，
 *   取最小正参数命中点。中心在凸多边形内部，正向射线必命中唯一边；无命中（toward≡中心）回退中心。
 */
const polygonBoundaryLocal = (radius: number, params: PolygonParams, toward: Position): Position => {
  const dl = Math.hypot(toward[0], toward[1]);
  if (dl < 1e-12) return [0, 0];
  const ux = toward[0] / dl;
  const uy = toward[1] / dl;
  const angles = vertexAngles(params);
  const verts: Array<Position> = angles.map(deg => {
    const a = deg * DEG_TO_RAD;
    return [radius * Math.cos(a), radius * Math.sin(a)];
  });
  let best = Infinity;
  for (let i = 0; i < verts.length; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % verts.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    // 解 o(0,0) + s·u = a + t·e（s≥0, t∈[0,1]）；det = u × (-e)
    const det = ux * -ey - -ex * uy;
    if (Math.abs(det) < 1e-12) continue;
    const s = (a[0] * -ey - -ex * a[1]) / det;
    const t = (ux * a[1] - a[0] * uy) / det;
    if (s <= 1e-9 || s >= best) continue;
    if (t >= -1e-9 && t <= 1 + 1e-9) best = s;
  }
  if (!Number.isFinite(best)) return [0, 0];
  return [best * ux, best * uy];
};

/**
 * polygon 注册项：正多边形（sides 顶点均布外接圆，rotate 定起始角）
 * @description 文本容器形状——circumscribe 从内框 `innerHalfWidth/Height` 推能容纳内框的外接圆、再取其 AABB 半轴，
 *   尺寸仍由内框 + minimumSize 驱动（区别于 sector / star 的 params-半径驱动）。emit 出 `sides` 个顶点连成的闭合
 *   path；boundaryPoint = 中心向 toward 射线 ∩ 多边形边；命名 anchor 走外接 AABB 的 9 名 rect anchor（多边形关于
 *   中心对称，AABB 中心 = 形心 = node position，无需 circumscribeOffset）；self-rotate（params.rotate）与
 *   Node.rotate 叠加。scaleParams：sides 是计数、rotate 是角度，均不随 scale 缩。
 *   diamond ≡ `{ type: 'polygon', params: { sides: 4, rotate: 45 } }`，由 compile 规范化。
 */
export const polygon = defineShape({
  paramsSchema: z.strictObject({
    sides: z
      .number()
      .int()
      .min(3)
      .describe('Number of sides of the regular polygon (>= 3).'),
    rotate: z
      .number()
      .finite()
      .optional()
      .describe('Shape self-rotation in degrees (vertex start direction); default 0. Composes with Node.rotate.'),
  }),
  circumscribe: (hw, hh, params: PolygonParams) => {
    const radius = circumradiusFor(hw, hh, params);
    const angles = vertexAngles(params);
    const halfWidth = Math.max(...angles.map(a => Math.abs(radius * Math.cos(a * DEG_TO_RAD))));
    const halfHeight = Math.max(...angles.map(a => Math.abs(radius * Math.sin(a * DEG_TO_RAD))));
    return { halfWidth, halfHeight };
  },
  boundaryPoint: (rect: Rect, toward: Position, params: PolygonParams): Position => {
    const radius = circumradiusFromRect(rect, params);
    const localToward = worldToLocal(rect, toward);
    const hit = polygonBoundaryLocal(radius, params, localToward);
    return localToWorld(rect, hit);
  },
  anchor: (rect: Rect, name: string, params: PolygonParams): Position | undefined => {
    void params;
    const a = asRectAnchor(name);
    return a ? rectOps.anchor(rect, a) : undefined;
  },
  *emit (rect: Rect, style, round, params: PolygonParams): Iterable<ScenePrimitive> {
    const radius = circumradiusFromRect(rect, params);
    const verts = polygonVertices(rect, radius, params);
    const commands: Array<PathCommand> = [];
    verts.forEach((v, i) => {
      commands.push({
        kind: i === 0 ? 'move' : 'line',
        to: [round(v[0]), round(v[1])],
      });
    });
    commands.push({ kind: 'close' });
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
  // sides 是计数、rotate 是角度——都不随 scale 缩（否则默认深缩会把 sides 缩坏）；返回原 params 不变。
  scaleParams: (params: PolygonParams): PolygonParams => params,
});
