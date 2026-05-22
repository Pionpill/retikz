import type { ScenePrimitive } from '../primitive';
import { type Ellipse, ellipse as ellipseOps } from '../geometry/ellipse';
import type { Rect } from '../geometry/rect';
import { asRectAnchor } from './_shared';
import type { ShapeDefinition } from './types';

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
 * @description circumscribe = 内框 ×√2（内框 4 顶点落在椭圆周上）；几何由外接框半轴派生；
 *   emit 出 EllipsePrim，与旧 `emitEllipseShape` 逐字段等价
 */
export const ellipse: ShapeDefinition = {
  circumscribe: (hw, hh) => ({ halfWidth: hw * Math.SQRT2, halfHeight: hh * Math.SQRT2 }),
  boundaryPoint: (r, toward) => ellipseOps.boundaryPoint(toEllipse(r), toward),
  anchor: (r, name) => {
    const a = asRectAnchor(name);
    return a ? ellipseOps.anchor(toEllipse(r), a) : undefined;
  },
  *emit (r, style, round): Iterable<ScenePrimitive> {
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
      opacity: style.opacity,
    };
  },
};
