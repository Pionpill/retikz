import type { IRChild, JsonValue } from '@retikz/core';
import type { DataLineageOptions, DataLineageRun, DataSourceIdentity, ExternalRow } from '@retikz/data';

import type { PlotLocatorOptions, ResolvedAnchor } from './locator';

/** plot row value 样本选项 */
export type PlotRowValueOptions = {
  /** 最大记录行数，必须为正整数 */
  maxRows: number;
  /** 允许记录值的字段白名单，必须非空；不允许省略后记录整行 */
  fields: Array<string>;
};

/** 宿主传入的 lineage metadata */
export type PlotHostLineageMetadata = {
  /** 宿主查询 id */
  queryId?: string;
  /** 数据集版本引用 */
  datasetVersion?: string;
  /** AI 计划引用 */
  aiPlanId?: string;
  /** prompt hash 或 prompt 引用摘要 */
  promptHash?: string;
  /** 权限策略引用 */
  permissionPolicyId?: string;
  /** 宿主自定义 JSON-safe metadata */
  extra?: Record<string, JsonValue>;
};

/** 宿主 metadata 透传开关 */
export type PlotHostLineageMetadataOptions = {
  /** 是否透传 queryId 与 datasetVersion */
  query?: boolean;
  /** 是否透传 AI 相关引用 */
  ai?: { promptReference?: boolean; planReference?: boolean };
  /** 是否透传 permissionPolicyId */
  permission?: boolean;
  /** 是否透传 extra */
  extra?: boolean;
};

/** plot lineage 运行时开关 */
export type PlotLineageOptions = {
  /** 数据层链路；默认只启用 data sourceIdentity + transformSteps */
  data?: DataLineageOptions;
  /** 是否补充 mark id；plot id、data reference、mark index / type 属于最小骨架，始终记录 */
  markIdentity?: boolean;
  /** 记录 mark encoding 消费的字段和 channel，不记录每行值 */
  markEncoding?: boolean;
  /** 记录 root transform 与 mark-local transform 的分段关系 */
  transformScopes?: boolean;
  /** 记录 spec.scales 中声明的 scale name、type、domain / range 摘要和 channel 绑定 */
  scaleMappings?: boolean;
  /** 记录 coordinate shorthand 与 composition 中的 view / facet / track 摘要 */
  layoutContext?: boolean;
  /** 记录 datum / series locator address 与最终 anchor */
  locatorAnchors?: boolean;
  /** 记录最终行值样本，必须限制字段和行数 */
  rowValues?: false | PlotRowValueOptions;
  /** 透传宿主提供的查询 / AI / 权限 metadata */
  hostMetadata?: false | PlotHostLineageMetadataOptions;
};

/** mark encoding 字段引用 */
export type PlotLineageEncodingField = {
  /** encoding channel 名 */
  channel: string;
  /** channel 消费的字段 */
  field: string;
  /** channel 绑定的 scale 名 */
  scale?: string;
};

/** plot mark transform scope 摘要 */
export type PlotLineageTransformScope = {
  /** root transform kind 列表 */
  root: Array<string>;
  /** mark-local transform kind 列表 */
  mark: Array<string>;
};

/** 单个 mark 的 lineage 摘要 */
export type PlotMarkLineage = {
  /** mark 在 spec.marks 中的下标 */
  markIndex: number;
  /** mark id */
  markId?: string;
  /** mark type */
  markType: string;
  /** mark encoding 字段引用 */
  encoding?: Array<PlotLineageEncodingField>;
  /** root / mark-local transform scope 摘要 */
  transformScope?: PlotLineageTransformScope;
  /** mark 最终行值样本 */
  rowValues?: Array<ExternalRow>;
};

/** 单个 mark 对应的数据 lineage */
export type PlotMarkDataLineage = {
  /** mark 在 spec.marks 中的下标 */
  markIndex: number;
  /** mark-local transform 运行事件 */
  events: DataLineageRun['events'];
};

/** scale lineage 摘要 */
export type PlotScaleChannelLineage = {
  /** mark 在 spec.marks 中的下标 */
  markIndex: number;
  /** 绑定到 scale 的 channel 名 */
  channel: string;
  /** channel 消费的字段 */
  field?: string;
};

/** scale lineage 摘要 */
export type PlotScaleLineage = {
  /** scale name */
  name: string;
  /** scale type */
  type: string;
  /** schema 中声明的 domain 摘要 */
  domain?: JsonValue;
  /** schema 中声明的 range 摘要 */
  range?: JsonValue;
  /** 使用该 scale 的 mark channel */
  channels?: Array<PlotScaleChannelLineage>;
};

/** layout lineage 摘要 */
export type PlotLayoutLineage = {
  /** coordinate type */
  coordinateType?: string;
  /** 是否包含 composition */
  hasComposition: boolean;
  /** composition 中声明的 coordinate view id */
  coordinateViews?: Array<string>;
  /** composition 中声明的 facet arrangement 摘要 */
  facets?: Array<{ id: string; view: string }>;
  /** composition 中声明的 track arrangement 摘要 */
  tracks?: Array<{ id: string; count: number }>;
};

/** plot lineage 运行结果 */
export type PlotLineageRun = {
  /** plot id */
  plotId?: string;
  /** 数据集引用名 */
  dataReference: string;
  /** data 层 root / mark-local lineage */
  data: {
    /** root transform lineage */
    root: DataLineageRun;
    /** mark-local transform lineage */
    marks: Array<PlotMarkDataLineage>;
  };
  /** mark 级可视语义 lineage */
  marks: Array<PlotMarkLineage>;
  /** scale lineage 摘要 */
  scales?: Array<PlotScaleLineage>;
  /** layout lineage 摘要 */
  layout?: PlotLayoutLineage;
  /** 宿主 metadata */
  hostMetadata?: PlotHostLineageMetadata;
};

/** lowerPlotWithLineage 返回值 */
export type PlotLineageLowerResult = {
  /** 下沉得到的 core IR children */
  children: Array<IRChild>;
  /** plot lineage artifact */
  lineage: PlotLineageRun;
};

/** locator lineage 查询结果 */
export type PlotLocatorAnchorLineage = {
  /** locator address */
  address: string;
  /** locator 解析出的 anchor */
  anchor: ResolvedAnchor;
};

/** locator lineage 查询结果 */
export type PlotDatumLineage = {
  /** locator 查询类型 */
  queryKind: 'datum';
  /** mark 在 spec.marks 中的下标 */
  markIndex: number;
  /** datum transformedIndex */
  transformedIndex: number;
  /** datum source identity */
  sourceIdentity?: DataSourceIdentity;
  /** 对应 mark lineage */
  mark?: PlotMarkLineage;
  /** locator address 与 anchor 摘要；仅在 locatorAnchors 打开时记录 */
  locatorAnchor?: PlotLocatorAnchorLineage;
};

/** series locator lineage 查询结果 */
export type PlotSeriesLineage = {
  /** locator 查询类型 */
  queryKind: 'series';
  /** mark 在 spec.marks 中的下标 */
  markIndex?: number;
  /** series 查询值 */
  seriesValue: string | number;
  /** 对应 mark lineage */
  mark?: PlotMarkLineage;
  /** locator address 与 anchor 摘要；仅在 locatorAnchors 打开时记录 */
  locatorAnchor?: PlotLocatorAnchorLineage;
};

/** locator lineage 查询结果 */
export type PlotLocatorQueryLineage = PlotDatumLineage | PlotSeriesLineage;

/** locator lineage 查询结果 */
export type PlotLineageResolvedAnchor = {
  /** 原 locator 解析出的 anchor */
  anchor: ResolvedAnchor;
  /** anchor 对应的 lineage 摘要 */
  lineage: PlotLocatorQueryLineage;
};

/** plot lineage locator */
export type PlotLineageLocator = {
  /** 查询 datum anchor 与 lineage */
  datum: (transformedIndex: number, options?: PlotLocatorOptions) => PlotLineageResolvedAnchor | null;
  /** 查询 series anchor 与 lineage */
  series: (value: string | number, options?: PlotLocatorOptions) => PlotLineageResolvedAnchor | null;
  /** 按地址解析 anchor 与 lineage */
  resolve: (address: string) => PlotLineageResolvedAnchor | null;
};
