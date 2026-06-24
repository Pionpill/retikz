import type { ArrowEndSpec } from '@retikz/core';
import type { SvgNode } from '../types';
import { compact } from './attrs';
import { buildMarkerPrim } from './marker-prim';

/**
 * 端点级已解析 marker spec → `<marker>` SvgNode
 * @description emit-in-compile 物化：marker 内部几何来自 `spec.marker`（core 已产 `MarkerPrimitive[]`），
 *   wrapper 参数来自 `spec.baseSize`（viewBox `0 0 baseSize baseSize` + refY = baseSize/2）/ `spec.refX` /
 *   `spec.markerWidth` / `spec.markerHeight`。`overflow=visible` 允许空心描边落在标准几何边界外。
 */
export const buildArrowMarker = (id: string, spec: ArrowEndSpec): SvgNode => ({
  tag: 'marker',
  attrs: compact({
    id,
    viewBox: `0 0 ${spec.baseSize} ${spec.baseSize}`,
    refX: spec.refX,
    refY: spec.baseSize / 2,
    markerWidth: spec.markerWidth,
    markerHeight: spec.markerHeight,
    orient: 'auto-start-reverse',
    markerUnits: 'strokeWidth',
    preserveAspectRatio: 'none',
    overflow: 'visible',
    opacity: spec.opacity,
  }),
  children: spec.marker.map(prim => buildMarkerPrim(prim)),
});
