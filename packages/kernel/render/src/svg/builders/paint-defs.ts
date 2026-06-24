import type { IRPaintSpec, PaintResource, ResolvedPatternTile } from '@retikz/core';
import type { SvgNode } from '../types';
import { gradientLineFromAngle } from '../../shared';
import { compact } from './attrs';
import { buildMarkerPrim } from './marker-prim';

/** fit → SVG preserveAspectRatio（cover 为缺省） */
const fitToPAR = (fit: 'fill' | 'contain' | 'cover' | undefined): string =>
  fit === 'fill' ? 'none' : fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';

/** gradient stops → `<stop>` 子节点列表 */
const buildStops = (
  stops: ReadonlyArray<{ offset: number; color: string; opacity?: number }>,
): Array<SvgNode> =>
  stops.map(s => ({
    tag: 'stop',
    attrs: compact({ offset: s.offset, 'stop-color': s.color, 'stop-opacity': s.opacity }),
  }));

/**
 * 物化已解析 pattern tile（emit-in-compile 产物）成 `<pattern>` SvgNode
 * @description 宽高 = `tile.size`、`patternUnits=userSpaceOnUse`（tile 固定 user units）、可选整体旋转；
 *   `tile.motif`（`MarkerPrimitive[]`）复用 `buildMarkerPrim` 物化（contextStroke → context-stroke）。
 */
const buildPatternTile = (tile: ResolvedPatternTile, id: string): SvgNode => ({
  tag: 'pattern',
  attrs: compact({
    id,
    width: tile.size,
    height: tile.size,
    patternUnits: 'userSpaceOnUse',
    patternTransform: tile.rotation ? `rotate(${tile.rotation})` : undefined,
  }),
  children: tile.motif.map(prim => buildMarkerPrim(prim)),
});

/**
 * 一个 paint 资源 → SVG paint server SvgNode（gradient / pattern / image）
 * @description gradient / image 用 objectBoundingBox（随形状缩放）；pattern 用 userSpaceOnUse（tile 固定 user units）。
 *   `id` 已由 caller 加实例前缀。pattern 资源缺 `tile` 是不该出现的 compile bug → 产空 `<pattern id>` 兜底、不抛。
 */
export const buildPaintDef = (resource: PaintResource, id: string): SvgNode => {
  const spec: IRPaintSpec = resource.spec;
  switch (spec.kind) {
    case 'linearGradient': {
      const gradientLine = gradientLineFromAngle(spec.angle);
      return {
        tag: 'linearGradient',
        attrs: {
          id,
          x1: gradientLine.x1,
          y1: gradientLine.y1,
          x2: gradientLine.x2,
          y2: gradientLine.y2,
        },
        children: buildStops(spec.stops),
      };
    }
    case 'radialGradient': {
      const [cx, cy] = spec.center ?? [0.5, 0.5];
      return {
        tag: 'radialGradient',
        attrs: { id, cx, cy, r: spec.radius ?? 0.5 },
        children: buildStops(spec.stops),
      };
    }
    case 'pattern':
      return resource.tile
        ? buildPatternTile(resource.tile, id)
        : { tag: 'pattern', attrs: { id } };
    case 'image':
      return {
        tag: 'pattern',
        attrs: { id, width: 1, height: 1, patternContentUnits: 'objectBoundingBox' },
        children: [
          {
            tag: 'image',
            attrs: { href: spec.href, width: 1, height: 1, preserveAspectRatio: fitToPAR(spec.fit) },
          },
        ],
      };
  }
};
