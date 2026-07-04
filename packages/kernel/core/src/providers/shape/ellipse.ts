import { z } from 'zod';

import type { ScenePrimitive } from '../../contract';
import type { Ellipse, Rect } from '../../shared';

import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import { CenterAnchor, ellipse, isDirectionalAnchor } from '../../shared';
import { ellipsePrimitiveStyle } from './style';

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
 * ellipse 注册项。
 * @description circumscribe 支持默认比例外接和等轴外接；circle 由 compile 解析为等轴 ellipse preset。
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
      ...ellipsePrimitiveStyle(style),
    };
  },
});
