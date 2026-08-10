import type { IRJsonObject } from '@retikz/core';
import type { ExternalRow, IRDataModel, IRDataReference } from '@retikz/data';
import type {
  IRPlotCoordinateOperation,
  IRPlotGuide,
  IRPlotMark,
  IRPlotMarkOperation,
  IRPlotScaleOperation,
  IRPlotSpec,
  IRPlotTransform,
  PlotAuthoringMark,
} from '@retikz/plot';

import type { ScaleProps } from '../components';

/** `<Plot coordinate>` 入口形态：字符串简写、内置对象配置或自定义坐标配置 */
export type CoordinateInput =
  | 'polar2D'
  | 'cartesian1D'
  | 'polar1D'
  | {
      /** 2D 极坐标 */
      type: 'polar2D';
      /** 环图内半径占外半径比例，`0` 表示实心饼
       * @default 0
       */
      innerRadius?: number;
      /** 角向起始角，单位为度
       * @default 0
       */
      startAngle?: number;
      /** 角向终止角，单位为度
       * @default 360
       */
      endAngle?: number;
    }
  | {
      /** 1D 笛卡尔直线 */
      type: 'cartesian1D';
      /** 轴向，`horizontal` 沿 x，`vertical` 沿 y
       * @default horizontal
       */
      orientation?: 'horizontal' | 'vertical';
    }
  | {
      /** 1D 极坐标圆周 */
      type: 'polar1D';
      /** 圆周半径占可用半径比例
       * @default 1
       */
      radius?: number;
      /** 角向起始角，单位为度
       * @default 0
       */
      startAngle?: number;
      /** 角向终止角，单位为度
       * @default 360
       */
      endAngle?: number;
    }
  | ({ type: string } & Record<string, unknown>);

/** 2D 极坐标入口配置 */
export type Polar2DCoordinateInput = Extract<CoordinateInput, { type: 'polar2D' }>;

/** 单个 mark transform shortcut 的装配上下文 */
export type MarkTransformShortcutContext = {
  /** 当前 mark */
  mark: IRPlotMark;
  /** 当前 mark 索引 */
  markIndex: number;
  /** Plot 内全部 marks */
  marks: ReadonlyArray<IRPlotMark>;
};

/** 把特定 mark 转换为 Plot-level transforms 的作者侧扩展 */
export type MarkTransformShortcutDefinition = {
  /** 匹配的 mark type */
  markType: string;
  /** 构造普通 Plot transforms */
  build: (context: MarkTransformShortcutContext) => Array<IRPlotTransform> | undefined;
};

/** `buildPlotSpec` 的坐标、数据模型和根级装配选项 */
export type BuildPlotSpecOptions = {
  /** 作为整张图外部 anchor 句柄的 IRPlotSpec id */
  id?: string;
  /** 组合场景下每张 Plot 自描述的固有宽度 */
  width?: number;
  /** 组合场景下每张 Plot 自描述的固有高度 */
  height?: number;
  /** 坐标系选择
   * @default cartesian2D
   */
  coordinate?: CoordinateInput;
  /** Plot 组合布局 */
  composition?: IRPlotSpec['composition'];
  /** 数据字段模型，声明后写入 `data.model`，并让未显式声明的位置比例尺按字段类型派生 */
  model?: IRDataModel;
  /** 直传的根级数据变换，装配在 `<Transform>` 收集结果与自动 mark shortcut 之前 */
  transforms?: Array<IRPlotTransform>;
  /** 把 mark 形态转换为普通 Plot-level transforms 的作者侧简写 */
  markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  /** Plot-owned canonical theme token 稀疏覆盖 */
  plotThemeTokens?: IRPlotSpec['plotThemeTokens'];
  /** 按 Axis dimension 覆盖 Plot-owned token 的有序规则 */
  plotThemeTokenRules?: IRPlotSpec['plotThemeTokenRules'];
  /** Plot 主题 */
  plotTheme?: IRPlotSpec['plotTheme'];
  /** 当前数据集可见字段名集合 */
  dataFieldNames?: ReadonlySet<string>;
  /** 是否省略未显式声明的位置比例尺绑定，让 lowering 按实际字段类型派生
   * @default false
   */
  deferPositionScaleInference?: boolean;
};

/** Plot composition 的规范 IR 形态 */
export type PlotComposition = NonNullable<IRPlotSpec['composition']>;

/** React declaration 的结构化来源路径 */
export type PlotDeclarationPath = ReadonlyArray<string | number>;

/** 带来源路径的显式 Plot declaration 值 */
export type PlotDeclarationSource<T> = {
  /** declaration 值 */
  value: T;
  /** declaration 来源路径 */
  path: PlotDeclarationPath;
};

/** Plot declaration normalization 的完整宿主上下文 */
export type PlotAuthoringContext = {
  /** 当前 Plot 数据引用 */
  data: IRDataReference;
  /** 可选数据模型 */
  model?: IRDataModel;
  /** 真实 rows 提供的 runtime-only 字段可见性 */
  dataFieldNames?: ReadonlySet<string>;
  /** 显式 scale 集合来源 */
  scales?: PlotDeclarationSource<ReadonlyArray<IRPlotScaleOperation>>;
  /** 显式坐标系来源 */
  coordinate?: PlotDeclarationSource<CoordinateInput>;
  /** 显式组合布局来源 */
  composition?: PlotDeclarationSource<PlotComposition>;
  /** 显式 guide 集合来源 */
  guides?: PlotDeclarationSource<ReadonlyArray<IRPlotGuide>>;
  /** 根级数据变换 */
  dataTransforms?: Array<IRPlotTransform>;
  /** mark 作者侧变换简写 */
  markTransformShortcuts?: Array<MarkTransformShortcutDefinition>;
  /** 规范化模式 */
  mode: 'plot-root' | 'chart-extension';
};

/** `normalizePlotDeclarations` 产出的 JSON-safe Plot member fragment */
export type PlotMemberFragment = {
  /** 根级变换 */
  transform?: Array<IRPlotTransform>;
  /** Plot 比例尺 */
  scales?: Array<IRPlotScaleOperation>;
  /** 单坐标系根 */
  coordinate?: IRPlotCoordinateOperation;
  /** 组合布局根 */
  composition?: PlotComposition;
  /** Plot guide 集合 */
  guides?: Array<IRPlotGuide>;
  /** Plot mark 集合 */
  marks?: Array<IRPlotMarkOperation>;
};

/** 运行时 datum label 解析器 */
export type ResolveLabelMap = Record<string, (row: ExternalRow) => string>;

/** declaration normalization 产生的 runtime-only sidecar */
export type PlotAuthoringRuntime = {
  /** 按 mark id 归一化的运行时标签解析器 */
  resolveLabel?: ResolveLabelMap;
};

/** 绑定 composition 作用域的 mark */
export type AxisBoundMark = Extract<PlotAuthoringMark, IRPlotMark>;

/** 绑定 composition 作用域的 guide */
export type AxisBoundGuide = IRPlotGuide & {
  /** facet 作用域 */
  facetId?: string;
  /** scaffold 作用域 */
  scaffoldId?: string;
  /** track 作用域 */
  trackId?: string;
};

/** Plot composition arrangement */
export type ArrangementSpec = NonNullable<PlotComposition['arrangements']>[number];

/** facet arrangement */
export type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;

/** tracks arrangement */
export type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;

/** scaffold track */
export type ScaffoldTrackSpec = SharedScaffoldSpec['tracks'][number];

/** normalization 中暂存的 facet */
export type CollectedFacet = FacetGridSpec & {
  /** composition spacing */
  spacing?: PlotComposition['spacing'];
  /** composition resolve */
  resolve?: PlotComposition['resolve'];
};

/** normalization 中暂存的 scaffold */
export type CollectedScaffold = Omit<SharedScaffoldSpec, 'coordinate'> & {
  /** scaffold coordinate */
  coordinate?: SharedScaffoldSpec['coordinate'];
  /** composition spacing */
  spacing?: PlotComposition['spacing'];
  /** composition resolve */
  resolve?: PlotComposition['resolve'];
};

/** declaration normalization 的可变累加器 */
export type NormalizationState = {
  /** 已收集的 mark */
  marks: Array<AxisBoundMark>;
  /** 已收集的 guide */
  guides: Array<AxisBoundGuide>;
  /** 已收集的 facet */
  facets: Array<CollectedFacet>;
  /** 已收集的 scaffold */
  scaffolds: Array<CollectedScaffold>;
  /** 显式变换 */
  transforms: Array<IRPlotTransform>;
  /** mark 简写自动装配的变换 */
  shortcutTransforms: Array<IRPlotTransform>;
  /** 显式声明的位置比例尺 */
  scales: Array<ScaleProps>;
  /** 仅运行时使用的标签解析器 */
  resolveLabels: ResolveLabelMap;
  /** 是否使用颜色 */
  colored: boolean;
  /** 使用到的颜色字段 */
  colorFields: Array<string>;
  /** 是否存在 interval mark */
  hasBar: boolean;
  /** 是否存在二维 interval mark */
  hasRect: boolean;
  /** 是否存在横向 interval mark */
  hasHorizontalBar: boolean;
  /** 是否存在扇区 interval mark */
  hasSector: boolean;
  /** 是否存在闭合 path mark */
  hasClosedLine: boolean;
};

/** Facet、Scaffold 与 Track 提供的声明作用域 */
export type CollectionContext = {
  /** facet id */
  facetId?: string;
  /** scaffold id */
  scaffoldId?: string;
  /** track id */
  trackId?: string;
};

/** collector 可识别的 React declaration kind */
export type PlotDeclarationKind =
  | 'facet'
  | 'scaffold'
  | 'track'
  | 'path-mark'
  | 'point-mark'
  | 'interval-mark'
  | 'reference-mark'
  | 'relation-mark'
  | 'axis'
  | 'legend'
  | 'scale'
  | 'transform'
  | 'unsupported';

/** collector 保存的单个 JSON-safe React declaration */
export type PlotAuthoringDeclaration = {
  /** 稳定组件 kind */
  kind: PlotDeclarationKind;
  /** 已移除 React children 与 runtime function 的 plain props */
  props: IRJsonObject;
  /** 组件在原始 ReactNode tree 中的结构化路径 */
  path: PlotDeclarationPath;
  /** Facet、Scaffold 或 Track 提供的声明上下文 */
  context?: CollectionContext;
};

/** collector 保存的有序 React declarations */
export type PlotAuthoringDeclarations = Array<PlotAuthoringDeclaration>;

/** 从 declaration props 分离出的 runtime-only source */
export type PlotAuthoringRuntimeSource = {
  /** runtime source kind */
  kind: 'resolve-label';
  /** 原始 callback prop 路径 */
  path: PlotDeclarationPath;
  /** callback 绑定的 mark id */
  markId?: string;
  /** runtime-only label resolver */
  resolveLabel: (row: ExternalRow) => string;
};

/** raw ReactNode collector 的完整输出 */
export type PlotDeclarationCollection = {
  /** JSON-safe declarations */
  declarations: PlotAuthoringDeclarations;
  /** 与 declarations 分离的 runtime-only sources */
  runtimeSources: Array<PlotAuthoringRuntimeSource>;
};
