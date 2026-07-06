import type { ValueOf } from '@retikz/core';

/**
 * Plot 语义图层的默认 core zIndex。
 * @description 数值只表达跨语义层的默认堆叠；同层内仍由源码顺序或局部机制决定。
 */
export const PlotLayerZIndex = {
  Background: -1000,
  Grid: -300,
  Mark: 0,
  Axis: 200,
  FacetLabel: 300,
  PlotLabel: 400,
  Legend: 500,
  Interaction: 900,
} as const;

export type PlotLayerZIndexValue = ValueOf<typeof PlotLayerZIndex>;
