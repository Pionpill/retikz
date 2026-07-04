import { z } from 'zod';

import type { ScenePrimitive } from '../../contract';
import type { Ellipse, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import { CenterAnchor, ellipse, isDirectionalAnchor } from '../../shared';

const ellipseParamsSchema = z.strictObject({
  circumscribe: z
    .enum(['proportional', 'equal'])
    .optional()
    .describe(
      'Circumscription policy from the inner content box: "proportional" (per-axis ×√2, ellipse) or "equal" (isotropic, circle: r = diagonal half-length). Default "proportional".',
    ),
});

type EllipseParams = z.infer<typeof ellipseParamsSchema>;

/** 外接框 Rect → Ellipse（rx/ry = 半宽/半高） */
const toEllipse = (r: Rect): Ellipse => ({
  x: r.x,
  y: r.y,
  rx: r.width / 2,
  ry: r.height / 2,
  rotate: r.rotate,
});

/**
 * ellipse 注册项
 * @description circumscribe 受 `params.circumscribe` 控制：`'equal'`（等轴，circle：两轴 = 内框对角线半长
 *   `√(hw²+hh²)`）/ `'proportional'`（默认，各轴 ×√2，内框 4 顶点落在椭圆周上）。几何由外接框半轴派生；
 *   emit / anchor / edgePoint / boundaryPoint 只一套（不读 `params`）。circle 作为内置 shape preset 在 compile 期解析为
 *   `{ type: 'ellipse', params: { circumscribe: 'equal' } }`。
 */
export const ellipseShape = defineShape<EllipseParams>({
  name: BuiltinShape.Ellipse,
  paramsSchema: ellipseParamsSchema,
  circumscribe: (hw, hh, params) =>
    params.circumscribe === 'equal'
      ? { halfWidth: Math.hypot(hw, hh), halfHeight: Math.hypot(hw, hh) }
      : { halfWidth: hw * Math.SQRT2, halfHeight: hh * Math.SQRT2 },
  boundaryPoint: (r, toward) => ellipse.boundaryPoint(toEllipse(r), toward),
  anchor: (r, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? ellipse.anchor(toEllipse(r), name) : undefined;
  },
  edgePoint: (r, side, t) => ellipse.edgePoint(toEllipse(r), side, t),
  *emit(r, style, round): Iterable<ScenePrimitive> {
    yield {
      type: 'ellipse',
      cx: round(r.x),
      cy: round(r.y),
      rx: round(r.width / 2),
      ry: round(r.height / 2),
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      stroke: style.stroke ?? 'currentColor',
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth ?? 1,
      dashPattern: style.dashPattern,
      dashOffset: style.dashOffset,
      opacity: style.opacity,
      shadow: style.shadow,
      blendMode: style.blendMode,
    };
  },
});
