import { type Circle, circle as circleOps } from '../geometry/circle';
import type { Rect } from '../geometry/rect';
import { ellipse } from './ellipse';
import { asRectAnchor } from './_shared';
import type { ShapeDefinition } from './types';

/** 外接框 Rect → Circle（radius = 半宽；circle 外接框宽=高） */
const toCircle = (r: Rect): Circle => ({ x: r.x, y: r.y, radius: r.width / 2, rotate: r.rotate });

/**
 * circle 注册项
 * @description circumscribe = 内框对角线/2（两轴相等）；几何走 circle 数学层；
 *   emit 复用 `ellipse.emit`（circle = rx=ry 的 ellipse），与旧 circle→`emitEllipseShape` 等价
 */
export const circle: ShapeDefinition = {
  circumscribe: (hw, hh) => {
    const r = Math.sqrt(hw * hw + hh * hh);
    return { halfWidth: r, halfHeight: r };
  },
  boundaryPoint: (r, toward) => circleOps.boundaryPoint(toCircle(r), toward),
  anchor: (r, name) => {
    const a = asRectAnchor(name);
    return a ? circleOps.anchor(toCircle(r), a) : undefined;
  },
  edgePoint: (r, side, t) => circleOps.edgePoint(toCircle(r), side, t),
  emit: (r, style, round) => ellipse.emit(r, style, round),
};
