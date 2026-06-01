import type { FC, ReactElement } from 'react';
import type { ArrowEndSpec } from '@retikz/core';
import { buildArrowMarker } from '@retikz/render/svg';
import { svgToReact } from './svgToReact';

/** `<ArrowMarker>` 组件 props */
export type ArrowMarkerProps = {
  /** marker 元素 id，用于 path markerStart / markerEnd 引用 */
  id: string;
  /** 端点级已解析 marker 描述（compile 已 merge / 查表 / 调 def.emit 产几何 + wrapper 参数） */
  spec: ArrowEndSpec;
};

/**
 * 单个 `<marker>` 元素薄绑定层
 * @description 物化逻辑在 `@retikz/render/svg` 的 `buildArrowMarker`（产中性 `SvgNode`）；本层只把它映射成 React
 *   element。emit-in-compile：marker 内部几何 / wrapper 参数全来自 `spec`，本层不算几何、不 switch shape。
 */
export const ArrowMarker: FC<ArrowMarkerProps> = ({ id, spec }) =>
  svgToReact(buildArrowMarker(id, spec)) as ReactElement;
