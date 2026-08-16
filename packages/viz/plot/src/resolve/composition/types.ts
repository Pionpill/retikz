import type { ExternalRow } from '@retikz/data';

import type { IRPlotAxisGuide, IRPlotCoordinateOperation, IRPlot } from '../../schemas';
import type { CoordinateArrangementKind, CoordinateViewPlacementKind } from '../../schemas';

/** Plot composition schema 的消费态 */
export type Composition = NonNullable<IRPlot['composition']>;

/** composition arrangement 联合 */
export type CoordinateArrangement = NonNullable<Composition['arrangements']>[number];

/** facet arrangement 消费态 */
export type FacetGrid = Extract<CoordinateArrangement, { kind: typeof CoordinateArrangementKind.Facet }>;

/** shared track arrangement 消费态 */
export type SharedScaffold = Extract<CoordinateArrangement, { kind: typeof CoordinateArrangementKind.Tracks }>;

/** shared track arrangement 中的单个 track */
export type ScaffoldTrack = SharedScaffold['tracks'][number];

/** composition layout 消费态 */
export type CompositionLayout = NonNullable<Composition['spacing']>;

/** composition resolve 消费态 */
export type CompositionResolve = NonNullable<Composition['resolve']>;

/** composition 中 facet / track arrangement 的存在性上下文 */
export type CompositionPolicyContext = {
  hasFacets: boolean;
  hasScaffolds: boolean;
};

/** composition axis 输出策略消费值 */
export type CompositionAxisPolicyValue = 'perScope' | 'outerShared' | 'none';

/** axis grid object 配置 */
export type AxisGridConfig = Exclude<NonNullable<IRPlotAxisGuide['grid']>, boolean>;

/** axis grid 显式目标选择器 */
export type GridTargetSelector = NonNullable<AxisGridConfig['select']>;

/** facet header label 样式消费态 */
export type FacetHeaderLabelStyle = Exclude<NonNullable<NonNullable<FacetGrid['header']>['row']>, boolean>;

/** facet 维度声明 */
export type FacetDimension = NonNullable<FacetGrid['row']>;

/** facet 层级中的单个维度声明 */
export type FacetDimensionItem =
  | Extract<FacetDimension, Array<unknown>>[number]
  | Exclude<FacetDimension, Array<unknown>>;

/** facet 支持的 JSON scalar */
export type FacetScalar = string | number | boolean | null;

/** 多层 facet 维度值 */
export type FacetTuple = Array<FacetScalar>;

/** 写入 panel context 的 facet 值 */
export type FacetPanelValue = FacetScalar | FacetTuple | undefined;

/** facet header 所属维度 */
export type FacetLabelDimension = 'row' | 'column';

/** lowering 中解析完成的单个 facet panel */
export type FacetPanel = {
  id: string;
  facet: FacetGrid;
  row: FacetPanelValue;
  column: FacetPanelValue;
  rowIndex: number;
  columnIndex: number;
  rows: Array<ExternalRow>;
};

/** 坐标 scope 在 composition 中的确定放置结果 */
export type CoordinateScopePlacement =
  | Exclude<
      NonNullable<NonNullable<NonNullable<IRPlot['composition']>['views']>[number]['placement']>,
      { kind: typeof CoordinateViewPlacementKind.Slot }
    >
  | { kind: 'track'; scaffold: string; track: string };

/** 坐标视图 registry 中确定后的单个视图条目 */
export type CoordinateScopeRegistryEntry = {
  id: string;
  coordinate: IRPlotCoordinateOperation;
  placement?: CoordinateScopePlacement;
  scaffold?: string;
  track?: string;
};

/** plot 内坐标视图及默认视图的解析结果 */
export type CoordinateScopeRegistry = {
  defaultScope: string;
  scopes: Array<CoordinateScopeRegistryEntry>;
};

/** plot composition 的 Source IR 确定结果，供 pipeline 编排阶段消费 */
export type CompositionResolution = {
  coordinateScopes: CoordinateScopeRegistry;
  layout?: CompositionLayout;
  resolve?: CompositionResolve;
  arrangements: Array<CoordinateArrangement>;
  facets: Array<FacetGrid>;
  scaffolds: Array<SharedScaffold>;
  policyContext: CompositionPolicyContext;
};
