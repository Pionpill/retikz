import type { FC } from 'react';
import type { ArrowEndSpec } from '@retikz/core';
import { renderMarkerPrim } from './markerPrim';

/** `<ArrowMarker>` 组件 props */
export type ArrowMarkerProps = {
  /** marker 元素 id，用于 path markerStart / markerEnd 引用 */
  id: string;
  /** 端点级已解析 marker 描述（compile 已 merge / 查表 / 调 def.emit 产几何 + wrapper 参数） */
  spec: ArrowEndSpec;
};

/**
 * 单个 `<marker>` 元素，由 `<defs>` 包起来
 * @description emit-in-compile 物化：marker 内部几何来自 `spec.marker`（core 已产 `MarkerPrimitive[]`），
 *   wrapper 参数来自 `spec.baseSize`（viewBox `0 0 baseSize baseSize` + refY = baseSize/2）/ `spec.refX` /
 *   `spec.markerWidth` / `spec.markerHeight`。react 不再 switch shape、不算几何、不需 arrows 注册表。
 *   overflow=visible 允许空心描边落在标准几何边界外。
 */
export const ArrowMarker: FC<ArrowMarkerProps> = props => {
  const { id, spec } = props;
  return (
    <marker
      id={id}
      viewBox={`0 0 ${spec.baseSize} ${spec.baseSize}`}
      refX={spec.refX}
      refY={spec.baseSize / 2}
      markerWidth={spec.markerWidth}
      markerHeight={spec.markerHeight}
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
      preserveAspectRatio="none"
      overflow="visible"
      opacity={spec.opacity}
    >
      {spec.marker.map((prim, i) => renderMarkerPrim(prim, i))}
    </marker>
  );
};
