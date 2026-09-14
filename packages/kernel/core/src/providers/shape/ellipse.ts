import { ellipse as mathEllipse } from '@retikz/math';
import type { infer as ZodInfer } from 'zod';
import { enum as zodEnum, strictObject } from 'zod';

import type { PathCommand, ScenePrimitive } from '../../contract';
import { defineShape } from '../../contract';
import { BuiltinShape } from '../../schemas';
import type { Rect } from '../../shared';
import { CenterAnchor, ellipse, isDirectionalAnchor, localToWorld, RAD_TO_DEG } from '../../shared';
import { ellipsePrimitiveStyle } from './style';

const ellipseParamsSchema = strictObject({
  circumscribe: zodEnum(['proportional', 'equal'])
    .optional()
    .describe(
      'Circumscription policy from the inner content box: "proportional" (per-axis ×√2, ellipse) or "equal" (isotropic, circle: r = diagonal half-length). Default "proportional".',
    ),
});

type EllipseParams = ZodInfer<typeof ellipseParamsSchema>;

/** 生成与 ellipse emit 共用半轴的闭合椭圆轮廓 */
const ellipseOutline = (bounds: Rect): Array<PathCommand> => {
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;
  const rotation = (bounds.rotate ?? 0) * RAD_TO_DEG;
  const start = localToWorld(bounds, [radiusX, 0]);
  return [
    { kind: 'move', to: start },
    {
      kind: 'ellipseArc',
      center: [bounds.x, bounds.y],
      radiusX,
      radiusY,
      startAngle: 0,
      endAngle: 360,
      ...(rotation === 0 ? {} : { rotation }),
    },
    { kind: 'close' },
  ];
};

/** 生成 ellipse 的中心和两条轴端点关键点 */
const ellipseKeyPoints = (bounds: Rect) => {
  const radiusX = bounds.width / 2;
  const radiusY = bounds.height / 2;
  return [
    { name: 'center', position: [bounds.x, bounds.y] as [number, number] },
    { name: 'right', position: localToWorld(bounds, [radiusX, 0]) },
    { name: 'bottom', position: localToWorld(bounds, [0, radiusY]) },
    { name: 'left', position: localToWorld(bounds, [-radiusX, 0]) },
    { name: 'top', position: localToWorld(bounds, [0, -radiusY]) },
  ];
};

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
  outline: bounds => ellipseOutline(bounds),
  keyPoints: bounds => ellipseKeyPoints(bounds),
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
