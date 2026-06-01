import type { MarkerFill, MarkerPathCommand, MarkerPrimitive } from '@retikz/core';
import type { SvgNode } from '../types';
import { buildPathD } from '../path-d-builder';
import { compact } from './attrs';

/**
 * marker fill 取值 → SVG fill 属性值
 * @description 纯色字符串直传；`{ kind:'contextStroke' }` → `context-stroke`（继承所在元素描边，主题反应）；
 *   省略（hollow 几何无 fill）→ `none`（SVG `<path>` 缺省填黑，空心几何必须显式置 `none`）。
 */
const markerFillToSvg = (fill: MarkerFill | undefined): string => {
  if (fill === undefined) return 'none';
  if (typeof fill === 'string') return fill;
  return 'context-stroke';
};

/** marker-local path 命令序列 → SVG `d` 字符串（复用主 path 的 `buildPathD`） */
const markerCommandsToD = (commands: ReadonlyArray<MarkerPathCommand>): string =>
  buildPathD(commands);

/**
 * 单个 `MarkerPrimitive` → `SvgNode`（arrow marker / pattern motif 共用物化）
 * @description core 已在 compile 把 emit 几何解析成纯数据；本 builder 只翻成 SVG 描述。group 递归；
 *   fill 走 `markerFillToSvg`（contextStroke → context-stroke）。属性名一律 SVG 真名（kebab）。
 */
export const buildMarkerPrim = (prim: MarkerPrimitive): SvgNode => {
  switch (prim.type) {
    case 'path':
      return {
        tag: 'path',
        attrs: compact({
          d: markerCommandsToD(prim.commands),
          fill: markerFillToSvg(prim.fill),
          'fill-opacity': prim.fillOpacity,
          'fill-rule': prim.fillRule,
          stroke: prim.stroke,
          'stroke-opacity': prim.strokeOpacity,
          'stroke-width': prim.strokeWidth,
          'stroke-dasharray': prim.dashPattern?.join(' '),
          'stroke-linecap': prim.strokeLinecap,
          'stroke-linejoin': prim.strokeLinejoin,
        }),
      };
    case 'ellipse':
      return {
        tag: 'ellipse',
        attrs: compact({
          cx: prim.cx,
          cy: prim.cy,
          rx: prim.rx,
          ry: prim.ry,
          fill: markerFillToSvg(prim.fill),
          'fill-opacity': prim.fillOpacity,
          stroke: prim.stroke,
          'stroke-opacity': prim.strokeOpacity,
          'stroke-width': prim.strokeWidth,
          'stroke-dasharray': prim.dashPattern?.join(' '),
          transform: prim.rotate ? `rotate(${prim.rotate} ${prim.cx} ${prim.cy})` : undefined,
        }),
      };
    case 'rect':
      return {
        tag: 'rect',
        attrs: compact({
          x: prim.x,
          y: prim.y,
          width: prim.width,
          height: prim.height,
          rx: prim.cornerRadius,
          ry: prim.cornerRadius,
          fill: markerFillToSvg(prim.fill),
          'fill-opacity': prim.fillOpacity,
          stroke: prim.stroke,
          'stroke-opacity': prim.strokeOpacity,
          'stroke-width': prim.strokeWidth,
          'stroke-dasharray': prim.dashPattern?.join(' '),
        }),
      };
    case 'group':
      return {
        tag: 'g',
        attrs: {},
        children: prim.children.map(child => buildMarkerPrim(child)),
      };
  }
};
