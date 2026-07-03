import { z } from 'zod';

import type { ScenePrimitive } from '../../contract';
import type { Position } from '../../shared/geometry';
import type { Rect } from '../../shared/geometry';
import type { ContourSegment } from '../../shared/geometry';

import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import { CenterAnchor, isDirectionalAnchor } from '../../shared';
import { rect } from '../../shared/geometry';
import { localToWorld } from '../../shared/geometry';
import { boundaryFromContour } from '../../shared/geometry';
import { verticesToSegments } from './outline';

/**
 * rectangle shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；仅 cornerRadius 一个可选长度字段。
 *   cornerRadius 从 Node 顶层迁入 params；缺省 / 0 = 直角。
 */
type RectangleParams = {
  /**
   * 矩形圆角半径。
   * @default 0
   */
  cornerRadius?: number;
};

/** 轴对齐 / 旋转矩形的 4 个角（CW 绕向：左上 → 右上 → 右下 → 左下），局部系经 localToWorld 投世界 */
const rectVertices = (bounds: Rect): Array<Position> => {
  const halfW = bounds.width / 2;
  const halfH = bounds.height / 2;
  return [
    localToWorld(bounds, [-halfW, -halfH]),
    localToWorld(bounds, [halfW, -halfH]),
    localToWorld(bounds, [halfW, halfH]),
    localToWorld(bounds, [-halfW, halfH]),
  ];
};

/**
 * rectangle 注册项（文本容器形状，尺寸由内框 + minimumSize 驱动）
 * @description circumscribe = identity（视觉边界 = 内框）；anchor / edgePoint 直接走 rect 数学层；
 *   boundaryPoint 把矩形 4 角构造成 4 条折线段、委托 rounded-contour 模块（cornerRadius 省略 / 0 出原尖角
 *   求交、>0 在每个角插逐角夹紧的 fillet 弧，连接感知倒角），rayOrigin = 矩形中心（= node position）。
 *   emit 仍出 RectPrim，圆角半径优先取 `params.cornerRadius`、回退到 `style.cornerRadius`。
 *   scaleParams：cornerRadius 是长度，随 node scale 用 uniform 几何均值因子协同缩放（边数 / 角度类参数才不缩）。
 */
export const rectangle = defineShape({
  name: BuiltinShape.Rectangle,
  paramsSchema: z.strictObject({
    cornerRadius: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        'Corner radius in user units; 0 / omitted = sharp corners. Clamped per corner to the largest non-self-intersecting fillet.',
      ),
  }),
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  boundaryPoint: (bounds: Rect, toward: Position, params: RectangleParams): Position => {
    const verts = rectVertices(bounds);
    const segments: Array<ContourSegment> = verticesToSegments(verts);
    const center: Position = [bounds.x, bounds.y];
    const hit = boundaryFromContour(segments, params.cornerRadius, center, toward);
    return hit ?? center;
  },
  anchor: (r, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? rect.anchor(r, name) : undefined;
  },
  edgePoint: (r, side, t) => rect.edgePoint(r, side, t),
  *emit(r, style, round, params: RectangleParams): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    // compile 已把顶层 Node.cornerRadius 合进 params（见 compile/node.ts），故与 boundaryPoint 一致只读 params.cornerRadius
    const cornerRadius = params.cornerRadius;
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
      shadow: style.shadow,
      blendMode: style.blendMode,
    };
  },
  scaleParams: (params: RectangleParams, sx: number, sy: number): RectangleParams =>
    params.cornerRadius === undefined ? params : { ...params, cornerRadius: params.cornerRadius * Math.sqrt(sx * sy) },
});
