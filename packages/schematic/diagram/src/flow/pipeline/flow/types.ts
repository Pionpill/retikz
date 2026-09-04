import type { LayoutChildResult } from '@retikz/core';
import type { BoundsInsets } from '@retikz/math';

import type { EffectiveFlowLayout, FlowLayoutInput } from '../../contract';
import type { CanonicalFlowDiagram, CanonicalFlowEntity, CanonicalFlowGroup, CanonicalFlowLayout } from '../../resolve';

/** Flow leaf 的真实 Graph probe 与布局输入 */
export type FlowLeafMeasurement = Readonly<{
  element: CanonicalFlowEntity;
  probe: LayoutChildResult;
  margin: Readonly<BoundsInsets>;
}>;
/** Flow Group shell 的布局输入 */
export type FlowGroupMeasurement = Readonly<{
  element: CanonicalFlowGroup;
  contentInsets: Readonly<BoundsInsets>;
}>;

/** Flow Layout 的无外壳布局记录 */
export type FlowLayoutMeasurement = Readonly<{
  element: CanonicalFlowLayout;
  contentInsets: Readonly<BoundsInsets>;
}>;

/** Flow element 的真实测量记录 */
export type FlowElementMeasurement = FlowLeafMeasurement | FlowGroupMeasurement | FlowLayoutMeasurement;

/** 一次 Flow layout callback 前的完整测量结果 */
export type FlowMeasurement = Readonly<{
  diagram: CanonicalFlowDiagram;
  input: FlowLayoutInput;
  elementMeasurements: ReadonlyMap<string, FlowElementMeasurement>;
  effectiveLayouts: ReadonlyMap<string, EffectiveFlowLayout>;
}>;
