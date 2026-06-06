import { z } from 'zod';
import type { ScenePrimitive } from '../primitive';
import { rect as rectOps } from '../geometry/rect';
import { asRectAnchor } from './_shared';
import { defineShape } from './define';

/**
 * rectangle shape 的 per-instance params 类型
 * @description 由 paramsSchema z.infer 派生（单一来源 zod）；仅 roundedCorners 一个可选长度字段。
 *   roundedCorners 从 Node 顶层迁入 params；缺省 / 0 = 直角。
 */
type RectangleParams = {
  roundedCorners?: number;
};

/**
 * rectangle 注册项（文本容器形状，尺寸由内框 + minimumSize 驱动）
 * @description circumscribe = identity（视觉边界 = 内框）；boundaryPoint / anchor 直接走 rect 数学层；
 *   emit 出 RectPrim，圆角半径优先取 `params.roundedCorners`、回退到 `style.roundedCorners`（顶层迁移期兼容）。
 *   scaleParams：roundedCorners 是长度，随 node scale 用 uniform 几何均值因子协同缩放（边数 / 角度类参数才不缩）。
 */
export const rectangle = defineShape({
  paramsSchema: z.strictObject({
    roundedCorners: z
      .number()
      .finite()
      .nonnegative()
      .optional()
      .describe('Corner radius in user units; 0 / omitted = sharp corners.'),
  }),
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  boundaryPoint: (r, toward) => rectOps.boundaryPoint(r, toward),
  anchor: (r, name) => {
    const a = asRectAnchor(name);
    return a ? rectOps.anchor(r, a) : undefined;
  },
  edgePoint: (r, side, t) => rectOps.edgePoint(r, side, t),
  *emit (r, style, round, params: RectangleParams): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
    // params.roundedCorners 优先；顶层 Node.roundedCorners（经 style.roundedCorners）迁移期回退
    const cornerRadius = params.roundedCorners ?? style.roundedCorners;
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
    params.roundedCorners === undefined
      ? params
      : { ...params, roundedCorners: params.roundedCorners * Math.sqrt(sx * sy) },
});
