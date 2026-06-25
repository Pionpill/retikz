import type { IRPaintSpec, PaintResource, ResolvedPatternTile } from '@retikz/core';
import type { SvgNode } from '../types';
import { gradientLineFromAngle, parseHexColor } from '../../shared';
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

type GradientStop = { offset: number; color: string; opacity?: number };

const CONIC_SEGMENTS = 360;
const CONIC_SEGMENT_OVERLAP_DEG = 0.25;

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

const normalizeStops = (stops: ReadonlyArray<GradientStop>): Array<GradientStop> => {
  const sorted = [...stops].sort((a, b) => a.offset - b.offset);
  if (sorted.length === 0) return [{ offset: 0, color: 'transparent' }, { offset: 1, color: 'transparent' }];
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const out: Array<GradientStop> = first.offset > 0 ? [{ ...first, offset: 0 }, ...sorted] : sorted;
  return last.offset < 1 ? [...out, { ...last, offset: 1 }] : out;
};

const channelToHex = (n: number): string =>
  Math.round(n).toString(16).padStart(2, '0');

const colorAt = (stops: ReadonlyArray<GradientStop>, t: number): { color: string; opacity?: number } => {
  const normalized = normalizeStops(stops);
  const offset = clamp01(t);
  let left = normalized[0];
  let right = normalized[normalized.length - 1];
  for (let i = 0; i < normalized.length - 1; i += 1) {
    if (offset >= normalized[i].offset && offset <= normalized[i + 1].offset) {
      left = normalized[i];
      right = normalized[i + 1];
      break;
    }
  }
  const span = right.offset - left.offset;
  const localT = span <= 1e-9 ? 0 : (offset - left.offset) / span;
  const leftRgb = parseHexColor(left.color);
  const rightRgb = parseHexColor(right.color);
  const opacity =
    left.opacity === undefined && right.opacity === undefined
      ? undefined
      : (left.opacity ?? 1) + ((right.opacity ?? 1) - (left.opacity ?? 1)) * localT;
  if (!leftRgb || !rightRgb) return { color: localT < 0.5 ? left.color : right.color, opacity };
  return {
    color: `#${channelToHex(leftRgb.r + (rightRgb.r - leftRgb.r) * localT)}${channelToHex(leftRgb.g + (rightRgb.g - leftRgb.g) * localT)}${channelToHex(leftRgb.b + (rightRgb.b - leftRgb.b) * localT)}`,
    opacity,
  };
};

const conicPoint = (cx: number, cy: number, radius: number, angleDeg: number): [number, number] => {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + Math.cos(rad) * radius, cy + Math.sin(rad) * radius];
};

const buildConicGradient = (
  spec: Extract<IRPaintSpec, { kind: 'conicGradient' }>,
  id: string,
): SvgNode => {
  const [cx, cy] = spec.center ?? [0.5, 0.5];
  const radius = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(1 - cx, cy),
    Math.hypot(cx, 1 - cy),
    Math.hypot(1 - cx, 1 - cy),
  ) * 1.02;
  const startAngle = spec.angle ?? 0;
  const children: Array<SvgNode> = [];
  for (let i = 0; i < CONIC_SEGMENTS; i += 1) {
    const t0 = i / CONIC_SEGMENTS;
    const t1 = (i + 1) / CONIC_SEGMENTS;
    const [x0, y0] = conicPoint(cx, cy, radius, startAngle + t0 * 360 - CONIC_SEGMENT_OVERLAP_DEG);
    const [x1, y1] = conicPoint(cx, cy, radius, startAngle + t1 * 360 + CONIC_SEGMENT_OVERLAP_DEG);
    const sample = colorAt(spec.stops, (t0 + t1) / 2);
    children.push({
      tag: 'path',
      attrs: compact({
        d: `M ${cx} ${cy} L ${x0} ${y0} L ${x1} ${y1} Z`,
        fill: sample.color,
        'fill-opacity': sample.opacity,
      }),
    });
  }
  return {
    tag: 'pattern',
    attrs: {
      id,
      width: 1,
      height: 1,
      patternUnits: 'objectBoundingBox',
      patternContentUnits: 'objectBoundingBox',
      viewBox: '0 0 1 1',
      preserveAspectRatio: 'none',
    },
    children,
  };
};

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
    case 'conicGradient':
      return buildConicGradient(spec, id);
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
