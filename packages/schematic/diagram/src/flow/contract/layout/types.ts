import type { RelationDirectionValue } from '@retikz/graph';
import type { BoundsInsets, BoundsRect, Position } from '@retikz/math';

import type { FlowDirectionValue, FlowLayoutAlignmentValue, FlowRoutingKindValue } from '../../shared';

/** Flow layout provider 使用的有效路由 */
export type FlowLayoutRouting = Readonly<{ kind: 'straight' }> | Readonly<{ kind: 'orthogonal'; cornerRadius: number }>;

/** Flow layout scope 已补全的有效配置 */
export type EffectiveFlowLayout = Readonly<{
  direction: FlowDirectionValue;
  nodeGap: number;
  rankGap: number;
  routing: FlowLayoutRouting;
}>;

/** Layout Definition 提供的唯一末端默认值 */
export type FlowLayoutDefaults = Readonly<{
  direction: FlowDirectionValue;
  nodeGap: number;
  rankGap: number;
  routing: Readonly<{
    kind: FlowRoutingKindValue;
    orthogonalCornerRadius?: number;
  }>;
}>;

/** Flow layout 固定尺寸 */
export type FlowLayoutSize = Readonly<Pick<BoundsRect, 'width' | 'height'>>;

/** 已测量的 Flow leaf 输入 */
export type FlowLayoutLeafInput = Readonly<{
  kind: 'leaf';
  id: string;
  rank?: number;
  size: FlowLayoutSize;
  margin: Readonly<BoundsInsets>;
}>;

/** 已测量的递归 Flow Group 输入 */
export type FlowLayoutGroupInput = Readonly<{
  kind: 'group';
  id: string;
  rank?: number;
  minimumSize: FlowLayoutSize;
  contentInsets: Readonly<BoundsInsets>;
  layout: EffectiveFlowLayout;
  elements: ReadonlyArray<FlowLayoutElementInput>;
}>;

/** 作者指定 placement 的递归 Flow Layout 输入 */
export type FlowLayoutContainerInput = Readonly<{
  kind: 'layout';
  id: string;
  rank?: number;
  layout: EffectiveFlowLayout;
  align: FlowLayoutAlignmentValue;
  elements: ReadonlyArray<FlowLayoutElementInput>;
}>;

/** Flow layout element 输入 */
export type FlowLayoutElementInput = FlowLayoutLeafInput | FlowLayoutGroupInput | FlowLayoutContainerInput;

/** 单个 Flow Layout direct child 的已测量 placement 输入 */
export type FlowLayoutPlacementElementInput = Readonly<{
  id: string;
  size: FlowLayoutSize;
  margin: Readonly<BoundsInsets>;
}>;

/** Flow Layout 固定 placement 的完整输入 */
export type FlowLayoutPlacementInput = Readonly<{
  layout: Readonly<{
    id: string;
    direction: FlowDirectionValue;
    gap: number;
    align: FlowLayoutAlignmentValue;
  }>;
  elements: ReadonlyArray<FlowLayoutPlacementElementInput>;
}>;

/** Flow Layout 固定 placement 的完整输出 */
export type FlowLayoutPlacementOutput = Readonly<{
  bounds: Readonly<BoundsRect>;
  elements: ReadonlyArray<FlowLayoutElementOutput>;
}>;

/** Flow Layout Definition 调用作者 placement 的同步执行边界 */
export type FlowLayoutExecutionContext = Readonly<{
  placeLayout: (input: FlowLayoutPlacementInput) => FlowLayoutPlacementOutput;
}>;

/** Flow layout relation 输入 */
export type FlowLayoutRelationInput = Readonly<{
  source: string;
  target: string;
  direction: RelationDirectionValue;
  routing: FlowLayoutRouting;
  labelSize?: FlowLayoutSize;
}>;

/** 一次原子 Flow layout callback 的完整输入 */
export type FlowLayoutInput = Readonly<{
  layout: EffectiveFlowLayout;
  elements: ReadonlyArray<FlowLayoutElementInput>;
  relations: ReadonlyArray<FlowLayoutRelationInput>;
}>;

/** 一个 Flow element 的根坐标系布局输出 */
export type FlowLayoutElementOutput = Readonly<{
  id: string;
  bounds: Readonly<BoundsRect>;
}>;

/** 一条 Flow relation 的根坐标系布局输出 */
export type FlowLayoutRelationOutput = Readonly<{
  points: ReadonlyArray<Readonly<Position>>;
  labelBounds?: Readonly<BoundsRect>;
}>;

/** 一次原子 Flow layout callback 的完整输出 */
export type FlowLayoutOutput = Readonly<{
  elements: ReadonlyArray<FlowLayoutElementOutput>;
  relations: ReadonlyArray<FlowLayoutRelationOutput>;
}>;

/** Layout Definition 对结构、方向与路由的权威保证 */
export type FlowLayoutCapabilities = Readonly<{
  compoundScopes: boolean;
  groupEndpoints: boolean;
  crossScopeRelations: boolean;
  cycles: boolean;
  selfLoops: boolean;
  parallelRelations: boolean;
  relationLabels: boolean;
  relationDirections: ReadonlyArray<RelationDirectionValue>;
  routingKinds: ReadonlyArray<FlowRoutingKindValue>;
}>;

/** 同步确定 Flow element bounds、relation route 与 label reservation 的布局定义 */
export type FlowLayoutDefinition = Readonly<{
  name: string;
  description: string;
  capabilities: FlowLayoutCapabilities;
  defaults: FlowLayoutDefaults;
  layout: (input: FlowLayoutInput, context: FlowLayoutExecutionContext) => FlowLayoutOutput;
}>;

/** 向 LLM 与工具描述当前真实 Flow layout registry 的 JSON-safe 项 */
export type FlowLayoutCatalogEntry = Readonly<
  Pick<FlowLayoutDefinition, 'name' | 'description' | 'capabilities' | 'defaults'> & {
    isDefault: boolean;
  }
>;
