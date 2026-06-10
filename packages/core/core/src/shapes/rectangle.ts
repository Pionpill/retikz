import { z } from 'zod';
import { localToWorld } from '../geometry/transform';
import type { Position } from '../geometry/point';
import { rect as rectOps } from '../geometry/rect';
import type { Rect } from '../geometry/rect';
import { type ContourSegment, boundaryFromContour } from '../geometry/contour';
import type { ScenePrimitive } from '../primitive';
import { verticesToSegments } from './contour';
import { asCompassAnchor } from './shared';
import { defineShape } from './define';

/**
 * rectangle shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；仅 cornerRadius 一个可选长度字段。
 *   cornerRadius 从 Node 顶层迁入 params；缺省 / 0 = 直角。
 */
type RectangleParams = {
  cornerRadius?: number;
};

/** 轴对齐 / 旋转矩形的 4 个角（CW 绕向：左上 → 右上 → 右下 → 左下），局部系经 localToWorld 投世界 */
const rectVertices = (rect: Rect): Array<Position> => {
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  return [
    localToWorld(rect, [-halfW, -halfH]),
    localToWorld(rect, [halfW, -halfH]),
    localToWorld(rect, [halfW, halfH]),
    localToWorld(rect, [-halfW, halfH]),
  ];
};

/**
 * rectangle 注册项（文本容器形状，尺寸由内框 + minimumSize 驱动）
 * @description circumscribe = identity（视觉边界 = 内框）；anchor / edgePoint 直接走 rect 数学层；
 *   boundaryPoint 把矩形 4 角构造成 4 条折线段、委托 rounded-contour 模块（cornerRadius 省略 / 0 出原尖角
 *   求交、>0 在每个角插逐角夹紧的 fillet 弧，连接感知倒角），rayOrigin = 矩形中心（= node position）。
 *   emit 仍出 RectPrim，圆角半径优先取 `params.cornerRadius`、回退到 `style.cornerRadius`（顶层迁移期兼容）。
 *   scaleParams：cornerRadius 是长度，随 node scale 用 uniform 几何均值因子协同缩放（边数 / 角度类参数才不缩）。
 */
export const rectangle = defineShape({
  paramsSchema: z.strictObject({
    cornerRadius: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe(
        'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  }),
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  boundaryPoint: (rect: Rect, toward: Position, params: RectangleParams): Position => {
    const verts = rectVertices(rect);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = [rect.x, rect.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (r, name) => {
    const a = asCompassAnchor(name);
    return a ? rectOps.anchor(r, a) : undefined;
  },
  edgePoint: (r, side, t) => rectOps.edgePoint(r, side, t),
  *emit (r, style, round, params: RectangleParams): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    // params.cornerRadius 优先；顶层 Node.cornerRadius（经 style.cornerRadius）迁移期回退
    const cornerRadius = params.cornerRadius ?? style.cornerRadius;
    yield {
      type: 'rect',
      x: round(r.x - halfW),
      y: round(r.y - halfH),
      width: round(r.width),
      height: round(r.height),
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      cornerRadius: cornerRadius !== undefined ? round(cornerRadius) : undefined,
      opacity: style.opacity,
    };
  },
  scaleParams: (params: RectangleParams, sx: number, sy: number): RectangleParams =>
    params.cornerRadius === undefined
      ? params
      : { ...params, cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) },
});
