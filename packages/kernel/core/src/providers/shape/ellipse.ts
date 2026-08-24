import type { infer as ZodInfer } from 'zod';

import { ellipse as mathEllipse } from '@retikz/math';
import { enum as zodEnum, strictObject } from 'zod';

import type { ScenePrimitive } from '../../contract';

import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import { CenterAnchor, ellipse, isDirectionalAnchor } from '../../shared';
import { ellipsePrimitiveStyle } from './style';

const ellipseParamsSchema = strictObject({
  circumscribe: zodEnum(['proportional', 'equal'])
    .optional()
    .describe(
      'Circumscription policy from the inner content box: "proportional" (per-axis ×√2, ellipse) or "equal" (isotropic, circle: r = diagonal half-length). Default "proportional".',
    ),
});

type EllipseParams = ZodInfer<typeof ellipseParamsSchema>;

/**
 * ellipse 注册项
 * @description circumscribe 支持默认比例外接和等轴外接；circle 由 compile 解析为等轴 ellipse preset
 */
export const ellipseShape = defineShape<EllipseParams>({
  name: BuiltinShape.Ellipse,
  paramsSchema: ellipseParamsSchema,
  circumscribe: (hw, hh, params) =>
    mathEllipse.circumscribedHalfAxes({ halfWidth: hw, halfHeight: hh }, params.circumscribe),
  boundaryPoint: (r, toward) => ellipse.boundaryPoint(mathEllipse.inscribedInBox(r), toward),
  anchor: (r, name) => {
    if (name === CenterAnchor.Center) return undefined;
    return isDirectionalAnchor(name) ? ellipse.anchor(mathEllipse.inscribedInBox(r), name) : undefined;
  },
  edgePoint: (r, side, t) => ellipse.edgePoint(mathEllipse.inscribedInBox(r), side, t),
  connectionEnvelope: (r, kind) => {
    const halfWidth = r.width / 2;
    const halfHeight = r.height / 2;
    if (kind === 'circle') {
      const radius = Math.max(halfWidth, halfHeight);
      return { halfWidth: radius, halfHeight: radius };
    }
    return { halfWidth, halfHeight };
  },
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
