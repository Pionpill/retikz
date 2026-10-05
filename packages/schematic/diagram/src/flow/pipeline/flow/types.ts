import type { LayoutChildResult } from '@retikz/core';
import type { BoundsInsets } from '@retikz/math';

import type { EffectiveFlowLayout, FlowLayoutInput } from '../../contract';
import type { CanonicalFlowDiagram, CanonicalFlowEntity, CanonicalFlowGroup, CanonicalFlowLayout } from '../../resolve';

/** Flow leaf 的真实 Graph probe 与布局输入 */
export type FlowLeafMeasurement = Readonly<{
  /** 待布局的已解析 Flow 实体 */
  element: CanonicalFlowEntity;
  /** 已投影 Flow 宽度策略后的最终 Graph Source */
  graph: CanonicalFlowEntity['graph'];
  /** 真实 Graph 几何的布局探测与重放结果 */
  probe: LayoutChildResult;
  /** 供布局避让使用的实体外边距 */
  margin: Readonly<BoundsInsets>;
}>;

/** Flow Group shell 的布局输入 */
export type FlowGroupMeasurement = Readonly<{
  /** 待布局的已解析 Flow 可见分组 */
  element: CanonicalFlowGroup;
  /** 分组外壳到可用内容区域的四边内缩 */
  contentInsets: Readonly<BoundsInsets>;
}>;

/** Flow Layout 的无外壳布局记录 */
export type FlowLayoutMeasurement = Readonly<{
  /** 待布局的已解析无外壳容器 */
  element: CanonicalFlowLayout;
  /** 该布局容器可用内容区域的四边内缩 */
  contentInsets: Readonly<BoundsInsets>;
}>;

/** Flow element 的真实测量记录 */
export type FlowElementMeasurement = FlowLeafMeasurement | FlowGroupMeasurement | FlowLayoutMeasurement;

/** 一次 Flow layout callback 前的完整测量结果 */
export type FlowMeasurement = Readonly<{
  /** 本次布局对应的完整已解析图示 */
  diagram: CanonicalFlowDiagram;
  /** 交给 Flow layout provider 的测量后输入 */
  input: FlowLayoutInput;
  /** 以作者元素身份索引的真实测量记录 */
  elementMeasurements: ReadonlyMap<string, FlowElementMeasurement>;
  /** 各布局作用域已经确定的有效配置 */
  effectiveLayouts: ReadonlyMap<string, EffectiveFlowLayout>;
}>;
