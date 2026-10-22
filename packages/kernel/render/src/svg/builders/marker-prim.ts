import type { MarkerPrimitive } from '@retikz/core';

import type { SvgNode } from '../types';
import { buildPrim } from './prim';

/** 将 marker 局部图元复用为 SVG 图元，省略 fill 时保持空心语义 */
export const buildMarkerPrim = (prim: MarkerPrimitive, paintRefUrl?: (id: string) => string): SvgNode => {
  if (prim.type === 'group') {
    const node = buildPrim({ ...prim, children: [] }, { paintRefUrl });
    return { ...node, children: prim.children.map(child => buildMarkerPrim(child, paintRefUrl)) };
  }
  return buildPrim({ ...prim, fill: prim.fill ?? 'none' }, { paintRefUrl });
};
