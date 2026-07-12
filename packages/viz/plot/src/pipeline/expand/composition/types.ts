import type { ExternalRow } from '@retikz/data';

import type { IRPlotAxisGuide, IRPlotSpec } from '../../../schemas';
import type { CoordinateArrangementKind } from '../../../schemas';

/** Plot composition schema 的消费态。 */
export type CompositionSpec = NonNullable<IRPlotSpec['composition']>;

/** composition arrangement 联合。 */
export type CoordinateArrangement = NonNullable<CompositionSpec['arrangements']>[number];

/** facet arrangement 消费态。 */
export type FacetGrid = Extract<CoordinateArrangement, { kind: typeof CoordinateArrangementKind.Facet }>;

/** shared track arrangement 消费态。 */
export type SharedScaffold = Extract<CoordinateArrangement, { kind: typeof CoordinateArrangementKind.Tracks }>;

/** shared track arrangement 中的单个 track。 */
export type ScaffoldTrack = SharedScaffold['tracks'][number];

/** composition layout 消费态。 */
export type CompositionLayout = NonNullable<CompositionSpec['spacing']>;

/** composition resolve 消费态。 */
export type CompositionResolve = NonNullable<CompositionSpec['resolve']>;

/** facet header label 样式消费态。 */
export type FacetHeaderLabelStyle = Exclude<NonNullable<NonNullable<FacetGrid['header']>['row']>, boolean>;

/** composition axis 输出策略消费值。 */
export type CompositionAxisPolicyValue = 'perScope' | 'outerShared' | 'none';

/** axis grid object 配置。 */
export type AxisGridConfig = Exclude<NonNullable<IRPlotAxisGuide['grid']>, boolean>;

/** axis grid 显式目标选择器。 */
export type GridTargetSelector = NonNullable<AxisGridConfig['select']>;

/** facet 维度声明。 */
export type FacetDimension = NonNullable<FacetGrid['row']>;

/** facet 层级中的单个维度声明。 */
export type FacetDimensionItem =
  | Extract<FacetDimension, Array<unknown>>[number]
  | Exclude<FacetDimension, Array<unknown>>;

/** facet 支持的 JSON scalar。 */
export type FacetScalar = string | number | boolean | null;

/** 多层 facet 维度值。 */
export type FacetTuple = Array<FacetScalar>;

/** 写入 panel context 的 facet 值。 */
export type FacetPanelValue = FacetScalar | FacetTuple | undefined;

/** facet header 所属维度。 */
export type FacetLabelDimension = 'row' | 'column';

/** lowering 中解析完成的单个 facet panel。 */
export type FacetPanel = {
  id: string;
  facet: FacetGrid;
  row: FacetPanelValue;
  column: FacetPanelValue;
  rowIndex: number;
  columnIndex: number;
  rows: Array<ExternalRow>;
};
