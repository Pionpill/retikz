import { z } from 'zod';
import { localToWorld, worldToLocal } from '../geometry/_transform';
import type { Position } from '../geometry/point';
import type { Rect } from '../geometry/rect';
import type { PathCommand, ScenePrimitive } from '../primitive';
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

/**
 * 正多边形外接圆半径：能容纳「内框半轴 hw/hh」矩形的最小外接圆
 * @description rectangle / polygon 是文本容器——尺寸由内框（text + padding）驱动，circumscribe 从内框推外接。
 *   TODO（实现 Agent 填真实数学）：当前 stub 取内框对角线半长作占位半径；正解应按 `sides` / `rotate` 求
 *   能罩住内框 AABB 四角的最小外接圆半径（与各顶点角度相关）。
 */
const circumradiusFor = (hw: number, hh: number, params: PolygonParams): number => {
  // TODO stub（实现 Agent 填）：占位为内框对角线半长；真实实现按 params.sides / rotate 求最小容纳半径。
  void params;
  return Math.hypot(hw, hh);
};

/**
 * 正多边形 `sides` 个顶点的世界坐标（外接圆半径 radius、起始角 rotate、绕 rect 中心）
 * @description 顶点均布外接圆：第 k 个顶点角 = rotate + k·(360/sides)；点在 rect 局部系算后经 localToWorld 投世界。
 *   emit / boundaryPoint / anchor 共用此真源。
 */
const polygonVertices = (rect: Rect, radius: number, params: PolygonParams): Array<Position> => {
  const { sides } = params;
  const startDeg = params.rotate ?? 0;
  const stepDeg = 360 / sides;
  const out: Array<Position> = [];
  for (let k = 0; k < sides; k++) {
    const a = (startDeg + k * stepDeg) * DEG_TO_RAD;
    out.push(localToWorld(rect, [radius * Math.cos(a), radius * Math.sin(a)]));
  }
  return out;
};

/**
 * polygon 注册项：正多边形（sides 顶点均布外接圆，rotate 定起始角）
 * @description 文本容器形状——circumscribe 从内框 `innerHalfWidth/Height` 推能容纳内框的外接圆、再取其 AABB 半轴，
 *   尺寸仍由内框 + minimumSize 驱动（区别于 sector / star 的 params-半径驱动）。emit 出 `sides` 个顶点连成的闭合
 *   path；boundaryPoint = 中心向 toward 射线 ∩ 多边形边；anchor 含 9 名 rect anchor + 顶点 / 边中点；
 *   self-rotate（params.rotate）与 Node.rotate 叠加。scaleParams：sides 是计数、rotate 是角度，均不随 scale 缩。
 *   diamond ≡ `{ type: 'polygon', params: { sides: 4, rotate: 45 } }`，由 compile 规范化。
 *
 *   注：circumscribe / boundaryPoint / anchor 的真实数学由实现 Agent 填（当前为占位 stub）；emit / 顶点几何已成型。
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
    // 外接圆 → 其 AABB 半轴：当前 stub 取顶点 bbox。占位下退化为「外接圆直径方框」（halfWidth=halfHeight=radius）。
    // TODO（实现 Agent）：按真实顶点集求精确 AABB 半轴（正多边形 AABB 通常小于外接圆方框）。
    const radius = circumradiusFor(hw, hh, params);
    return { halfWidth: radius, halfHeight: radius };
  },
  boundaryPoint: (rect: Rect, toward: Position, params: PolygonParams): Position => {
    // TODO stub（实现 Agent 填）：中心向 toward 射线 ∩ 多边形各边、取最近正向交点。
    // 占位返回中心，保证 round-trip / schema / scaleParams 类 case 可独立通过。
    void worldToLocal;
    void polygonVertices;
    void toward;
    void params;
    return [rect.x, rect.y];
  },
  anchor: (rect: Rect, name: string, params: PolygonParams): Position | undefined => {
    // TODO stub（实现 Agent 填）：center 已可返回；顶点 / 边中点 / 9 名 rect anchor 待真实几何。
    void params;
    if (name === 'center') return [rect.x, rect.y];
    return undefined;
  },
  *emit (rect: Rect, style, round, params: PolygonParams): Iterable<ScenePrimitive> {
    const radius = circumradiusFor(rect.width / 2, rect.height / 2, params);
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
