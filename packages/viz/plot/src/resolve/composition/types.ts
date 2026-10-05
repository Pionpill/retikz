import type { ExternalRow } from '@retikz/data';

import type { IRPlot, IRPlotAxisGuide, IRPlotCoordinateOperation } from '../../schemas';
import type { CoordinateArrangementKind, CoordinateViewPlacementKind } from '../../schemas';

/** Plot composition schema 的消费态 */
export type Composition = NonNullable<IRPlot['composition']>;

/** 把 facet 作者配置解析为完整 Plot composition 所需的窄上下文 */
export type PlotFacetCompositionResolveContext = {
  /** template view 使用的主 coordinate */
  coordinate: IRPlotCoordinateOperation;
  /** 显式 template view id；省略时由 facet id 派生 */
  templateViewId?: string;
  /** Plot 低层 authoring 为生成 panel 指定的 coordinate */
  facetCoordinate?: IRPlotCoordinateOperation;
  /** Plot 低层 authoring 为生成 panel 指定的 view id template */
  panelViewIdTemplate?: string;
};

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
  /** 组合中是否存在分面排列 */
  hasFacets: boolean;
  /** 组合中是否存在共享轨道排列 */
  hasScaffolds: boolean;
};

/** composition axis 输出策略消费值 */
export type CompositionAxisPolicy = 'perScope' | 'outerShared' | 'none';

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
  /** 当前分面面板的稳定标识 */
  id: string;
  /** 产生该面板的分面排列声明 */
  facet: FacetGrid;
  /** 面板所属行的单值或多层分面值 */
  row: FacetPanelValue;
  /** 面板所属列的单值或多层分面值 */
  column: FacetPanelValue;
  /** 面板在分面网格中的行索引 */
  rowIndex: number;
  /** 面板在分面网格中的列索引 */
  columnIndex: number;
  /** 筛选到当前面板的有效数据行 */
  rows: Array<ExternalRow>;
};

/** 坐标 scope 在 composition 中的确定放置结果 */
export type CoordinateScopePlacement =
  | Exclude<
      NonNullable<NonNullable<NonNullable<IRPlot['composition']>['views']>[number]['placement']>,
      {
        /** 标识放置于共享骨架的轨道内 */
        kind: typeof CoordinateViewPlacementKind.Slot;
      }
    >
  | {
      /** 标识放置于共享骨架的轨道内 */
      kind: 'track';
      /** 目标共享坐标骨架的身份 */
      scaffold: string;
      /** 目标骨架内的轨道身份 */
      track: string;
    };

/** 坐标视图 registry 中确定后的单个视图条目 */
export type CoordinateScopeRegistryEntry = {
  /** 当前坐标视图的唯一身份 */
  id: string;
  /** 该视图采用的坐标操作 */
  coordinate: IRPlotCoordinateOperation;
  /** 视图在组合空间中的确定放置方式 */
  placement?: CoordinateScopePlacement;
  /** 视图所属的共享坐标骨架身份 */
  scaffold?: string;
  /** 视图所属的共享轨道身份 */
  track?: string;
};

/** plot 内坐标视图及默认视图的解析结果 */
export type CoordinateScopeRegistry = {
  /** 没有显式视图引用时使用的坐标视图身份 */
  defaultScope: string;
  /** 已经确定身份和放置关系的坐标视图列表 */
  scopes: Array<CoordinateScopeRegistryEntry>;
};

/** plot composition 的 Source IR 确定结果，供 pipeline 编排阶段消费 */
export type CompositionResolution = {
  /** 已确定的坐标视图及默认选择 */
  coordinateScopes: CoordinateScopeRegistry;
  /** 组合区域间距与外边距配置 */
  layout?: CompositionLayout;
  /** 各维度的共享尺度与坐标轴策略 */
  resolve?: CompositionResolve;
  /** 已收集的分面与轨道排列声明 */
  arrangements: Array<CoordinateArrangement>;
  /** 供分面展开使用的排列声明 */
  facets: Array<FacetGrid>;
  /** 供共享坐标轨道装配使用的排列声明 */
  scaffolds: Array<SharedScaffold>;
  /** 决定组合缺省策略的分面与轨道存在性 */
  policyContext: CompositionPolicyContext;
};
