import type { ScenePrimitive } from '../primitive';
import { type Diamond, diamond as diamondOps } from '../geometry/diamond';
import type { Rect } from '../geometry/rect';
import { asRectAnchor } from './_shared';
import type { ShapeDefinition } from './types';

/** 外接框 Rect → Diamond（halfA/halfB = 半宽/半高；顶点在 ±halfA / ±halfB） */
const toDiamond = (r: Rect): Diamond => ({
  x: r.x,
  y: r.y,
  halfA: r.width / 2,
  halfB: r.height / 2,
  rotate: r.rotate,
});

/**
 * diamond 注册项
 * @description circumscribe = 内框 ×2（内框 4 顶点落在菱形 4 边上）；几何由外接框半轴派生；
 *   emit 在**轴对齐空间**取 4 顶点出 PathPrim（rotate 由外层 group 施加），与旧 `emitDiamondShape(unrotated(...))` 等价
 */
export const diamond: ShapeDefinition = {
  circumscribe: (hw, hh) => ({ halfWidth: hw * 2, halfHeight: hh * 2 }),
  boundaryPoint: (r, toward) => diamondOps.boundaryPoint(toDiamond(r), toward),
  anchor: (r, name) => {
    const a = asRectAnchor(name);
    return a ? diamondOps.anchor(toDiamond(r), a) : undefined;
  },
  edgePoint: (r, side, t) => diamondOps.edgePoint(toDiamond(r), side, t),
  *emit (r, style, round): Iterable<ScenePrimitive> {
    const d = toDiamond(r);
    const e = diamondOps.anchor(d, 'east');
    const n = diamondOps.anchor(d, 'north');
    const w = diamondOps.anchor(d, 'west');
    const s = diamondOps.anchor(d, 'south');
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(e[0]), round(e[1])] },
        { kind: 'line', to: [round(n[0]), round(n[1])] },
        { kind: 'line', to: [round(w[0]), round(w[1])] },
        { kind: 'line', to: [round(s[0]), round(s[1])] },
        { kind: 'close' },
      ],
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
