import type {
  IRPlotCoordinateOperation,
  IRPlotGuide,
  IRPlotIntervalMark,
  IRPlotMarkOperation,
  IRPlotPathMark,
  IRPlotPointMark,
  IRPlotScaleOperation,
  IRPlotSpec,
} from '../../schemas';

type PlotComposition = NonNullable<IRPlotSpec['composition']>;
type PlotArrangement = NonNullable<PlotComposition['arrangements']>[number];
type FacetGridSpec = Extract<PlotArrangement, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<PlotArrangement, { kind: 'tracks' }>;

/** 支持按坐标轴分配 coordinate view 的内置 position mark */
type PlotAxisBindableMark = IRPlotPathMark | IRPlotPointMark | IRPlotIntervalMark;

/** mark 共享的 topology authoring binding */
type PlotTopologyBindings = {
  /** 绑定的 facet id */
  facetId?: string;
  /** 绑定的 scaffold track id */
  trackId?: string;
};

/** position mark 专属的 axis authoring binding */
type PlotAxisBindings = {
  /** 绑定的 x 轴 id */
  xAxisId?: string;
  /** 绑定的 y 轴 id */
  yAxisId?: string;
};

/** 为非 position mark 保留可诊断的 axis binding 禁用边界 */
type PlotForbiddenAxisBindings = {
  /** 非 position mark 不支持 x 轴 binding */
  xAxisId?: never;
  /** 非 position mark 不支持 y 轴 binding */
  yAxisId?: never;
};

/** Plot mark 的 framework-neutral authoring 输入 */
export type PlotAuthoringMark =
  | (PlotAxisBindableMark & PlotTopologyBindings & PlotAxisBindings)
  | (Exclude<IRPlotMarkOperation, PlotAxisBindableMark> & PlotTopologyBindings & PlotForbiddenAxisBindings);

/** Plot guide 的 framework-neutral authoring 输入 */
export type PlotAuthoringGuide = IRPlotGuide & {
  /** 绑定的 facet id */
  facetId?: string;
  /** 绑定的 scaffold id */
  scaffoldId?: string;
  /** 绑定的 scaffold track id */
  trackId?: string;
};

/** facet composition 的 plain authoring 输入 */
export type PlotFacetInput = Omit<FacetGridSpec, 'kind' | 'view' | 'row' | 'column'> & {
  /** 行方向分面字段或完整维度配置 */
  row?: string | NonNullable<FacetGridSpec['row']>;
  /** 列方向分面字段或完整维度配置 */
  column?: string | NonNullable<FacetGridSpec['column']>;
  /** 分面单元对应的 coordinate view id */
  view?: string;
  /** 当前 facet arrangement 的间距配置 */
  spacing?: PlotComposition['spacing'];
  /** 当前 facet arrangement 的 scale、axis 与 grid resolve 配置 */
  resolve?: PlotComposition['resolve'];
};

/** shared tracks composition 的 plain authoring 输入 */
export type PlotScaffoldInput = Omit<SharedScaffoldSpec, 'kind' | 'coordinate'> & {
  /** scaffold 内 track 使用的坐标系；缺省继承 Plot 坐标系 */
  coordinate?: SharedScaffoldSpec['coordinate'];
  /** 当前 scaffold arrangement 的间距配置 */
  spacing?: PlotComposition['spacing'];
  /** 当前 scaffold arrangement 的 scale、axis 与 grid resolve 配置 */
  resolve?: PlotComposition['resolve'];
};

/** 创建 canonical PlotSpec 的 framework-neutral authoring 输入 */
export type PlotAuthoringInput = Omit<IRPlotSpec, 'namespace' | 'type' | 'marks' | 'guides'> & {
  /** Plot mark 列表，可使用 authoring-only binding 字段 */
  marks: Array<PlotAuthoringMark>;
  /** Plot guide 列表，可使用 authoring-only binding 字段 */
  guides?: Array<PlotAuthoringGuide>;
  /** 待展开的 facet 声明 */
  facets?: Array<PlotFacetInput>;
  /** 待展开的 shared scaffold 声明 */
  scaffolds?: Array<PlotScaffoldInput>;
};

/** 共享 binding normalization 的输入 */
export type NormalizePlotBindingsInput = {
  /** 待规范化的 mark */
  marks: ReadonlyArray<PlotAuthoringMark>;
  /** 待规范化的 guide */
  guides: ReadonlyArray<PlotAuthoringGuide>;
  /** 现有 scale 声明 */
  scales: ReadonlyArray<IRPlotScaleOperation>;
  /** Plot 默认坐标系 */
  coordinate?: IRPlotCoordinateOperation;
  /** 显式 composition；不能与 facet / scaffold sugar 混用 */
  composition?: IRPlotSpec['composition'];
  /** 待展开的 facet 声明 */
  facets: ReadonlyArray<PlotFacetInput>;
  /** 待展开的 shared scaffold 声明 */
  scaffolds: ReadonlyArray<PlotScaffoldInput>;
};

/** 共享 binding normalization 的 canonical 结果 */
export type NormalizedPlotBindings = {
  /** 已移除 authoring-only 字段的 mark */
  marks: Array<IRPlotMarkOperation>;
  /** 已移除 authoring-only 字段的 guide */
  guides: Array<IRPlotGuide>;
  /** 轴绑定展开后的 scale */
  scales: Array<IRPlotScaleOperation>;
  /** 未使用 composition 时的 canonical 坐标系 */
  coordinate?: IRPlotCoordinateOperation;
  /** 显式或由 binding sugar 展开的 composition */
  composition?: IRPlotSpec['composition'];
};
