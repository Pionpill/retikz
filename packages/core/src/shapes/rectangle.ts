import type { ScenePrimitive } from '../primitive';
import { rect as rectOps } from '../geometry/rect';
import { asRectAnchor } from './_shared';
import type { ShapeDefinition } from './types';

/**
 * rectangle 注册项
 * @description circumscribe = identity（视觉边界 = 内框）；boundaryPoint / anchor 直接走 rect 数学层；
 *   emit 出 RectPrim（圆角走 cornerRadius），与旧 `emitRectShape` 逐字段等价
 */
export const rectangle: ShapeDefinition = {
  circumscribe: (hw, hh) => ({ halfWidth: hw, halfHeight: hh }),
  boundaryPoint: (r, toward) => rectOps.boundaryPoint(r, toward),
  anchor: (r, name) => {
    const a = asRectAnchor(name);
    return a ? rectOps.anchor(r, a) : undefined;
  },
  *emit (r, style, round): Iterable<ScenePrimitive> {
    const halfW = r.width / 2;
    const halfH = r.height / 2;
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
      cornerRadius: style.roundedCorners,
      opacity: style.opacity,
    };
  },
};
