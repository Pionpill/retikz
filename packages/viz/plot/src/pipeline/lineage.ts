import type { JsonValue } from '@retikz/core';
import type { DataSourceIdentity, ExternalDatasets, ExternalRow } from '@retikz/data';

import { resolveFieldPath } from '@retikz/data';

import type {
  PlotDatumLineage,
  PlotHostLineageMetadata,
  PlotLineageAnchorResolution,
  PlotLineageLocator,
  PlotLineageLowerResult,
  PlotLineageOptions,
  PlotMarkDataLineage,
  PlotMarkLineage,
  PlotRowValueOptions,
  PlotScaleLineage,
  PlotSeriesLineage,
} from '../contract';
import type { IRPlot, IRPlotMarkOperation, IRPlotScaleOperation, IRPlotTransform } from '../schemas';
import type { LowerPlotsOptions } from './expand';
import type { PlotDataArtifact } from './expand/lower';

import { RetikzPlotError } from '../error';
import { resolvePlotLineageOptions } from '../resolve/lineage';
import { CoordinateArrangementKind } from '../schemas';
import { lowerPlotWithDataArtifact } from './expand/lower';
import { buildPlotLocatorFromDataArtifact } from './locator';

/** lowerPlotWithLineage 选项 */
export type PlotLineageLowerOptions = LowerPlotsOptions & {
  /** plot lineage 开关；false 时关闭可选摘要，只返回最小结构 */
  lineage?: false | PlotLineageOptions;
  /** 宿主提供的 JSON-safe lineage metadata */
  hostLineageMetadata?: PlotHostLineageMetadata;
};

/** 把任意值裁剪成 JSON-safe metadata */
const toJsonValue = (value: unknown): JsonValue | undefined => {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (Array.isArray(value)) {
    const values = value.map(item => toJsonValue(item)).filter((item): item is JsonValue => item !== undefined);
    return values;
  }
  if (typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      const json = toJsonValue(item);
      if (json !== undefined) out[key] = json;
    }
    return out;
  }
  return String(value);
};

/** 读取 channel 中的字段引用 */
const encodingFieldOf = (channel: unknown): { field: string; scale?: string } | undefined => {
  if (channel === null || typeof channel !== 'object') return undefined;
  const record = channel as { field?: unknown; kind?: unknown; value?: unknown; scale?: unknown };
  const field =
    typeof record.field === 'string'
      ? record.field
      : record.kind === 'field' && typeof record.value === 'string'
        ? record.value
        : undefined;
  if (field === undefined) return undefined;
  return typeof record.scale === 'string' ? { field, scale: record.scale } : { field };
};

/** 收集 mark encoding 字段引用 */
const markEncodingFields = (mark: IRPlotMarkOperation): PlotMarkLineage['encoding'] => {
  const encoding = (mark as { encoding?: Record<string, unknown> }).encoding;
  if (encoding === undefined) return [];
  const out: NonNullable<PlotMarkLineage['encoding']> = [];
  for (const [channel, value] of Object.entries(encoding)) {
    if (channel === 'channels') continue;
    const field = encodingFieldOf(value);
    if (field !== undefined) out.push({ channel, ...field });
  }
  const extensionChannels = encoding.channels;
  if (extensionChannels !== null && typeof extensionChannels === 'object' && !Array.isArray(extensionChannels)) {
    for (const [channel, value] of Object.entries(extensionChannels)) {
      const field = encodingFieldOf(value);
      if (field !== undefined) out.push({ channel, ...field });
    }
  }
  return out;
};

/** 取 operation kind 列表 */
const operationKindsOf = (operations: Array<IRPlotTransform> | undefined): Array<string> =>
  operations?.map(operation => operation.kind) ?? [];

/** 按字段白名单裁剪 mark rows */
const sampleRows = (rows: Array<ExternalRow>, options: PlotRowValueOptions): Array<ExternalRow> =>
  rows.slice(0, options.maxRows).map(row => {
    const out: ExternalRow = {};
    for (const field of options.fields) out[field] = resolveFieldPath(row, field);
    return out;
  });

/** 按开关透传宿主 metadata */
const hostMetadataOf = (
  options: false | NonNullable<PlotLineageOptions['hostMetadata']>,
  metadata: PlotHostLineageMetadata | undefined,
): PlotHostLineageMetadata | undefined => {
  if (options === false || metadata === undefined) return undefined;
  const out: PlotHostLineageMetadata = {};
  if (options.query) {
    if (metadata.queryId !== undefined) out.queryId = metadata.queryId;
    if (metadata.datasetVersion !== undefined) out.datasetVersion = metadata.datasetVersion;
  }
  if (options.ai?.planReference && metadata.aiPlanId !== undefined) out.aiPlanId = metadata.aiPlanId;
  if (options.ai?.promptReference && metadata.promptHash !== undefined) out.promptHash = metadata.promptHash;
  if (options.permission && metadata.permissionPolicyId !== undefined)
    out.permissionPolicyId = metadata.permissionPolicyId;
  if (options.extra && metadata.extra !== undefined) out.extra = metadata.extra;
  return Object.keys(out).length === 0 ? undefined : out;
};

/** 生成 layout lineage 摘要 */
const layoutLineageOf = (spec: IRPlot): NonNullable<PlotLineageLowerResult['lineage']['layout']> => {
  const composition = spec.composition as
    | {
        views?: Array<{ id?: unknown }>;
        arrangements?: Array<{ kind?: unknown; id?: unknown; view?: unknown; tracks?: Array<unknown> }>;
      }
    | undefined;
  const coordinateViews = composition?.views?.map(view => view.id).filter((id): id is string => typeof id === 'string');
  const facets = composition?.arrangements
    ?.filter(arrangement => arrangement.kind === CoordinateArrangementKind.Facet)
    .flatMap(arrangement =>
      typeof arrangement.id === 'string' && typeof arrangement.view === 'string'
        ? [{ id: arrangement.id, view: arrangement.view }]
        : [],
    );
  const tracks = composition?.arrangements
    ?.filter(arrangement => arrangement.kind === CoordinateArrangementKind.Tracks)
    .flatMap(arrangement =>
      typeof arrangement.id === 'string' && Array.isArray(arrangement.tracks)
        ? [{ id: arrangement.id, count: arrangement.tracks.length }]
        : [],
    );
  return {
    coordinateType: spec.coordinate?.type,
    hasComposition: spec.composition !== undefined,
    ...(coordinateViews !== undefined && coordinateViews.length > 0 ? { coordinateViews } : {}),
    ...(facets !== undefined && facets.length > 0 ? { facets } : {}),
    ...(tracks !== undefined && tracks.length > 0 ? { tracks } : {}),
  };
};

/** 从坐标配置推断位置 channel 绑定的 scale */
const coordinateScaleNameOf = (spec: IRPlot, channel: string): string | undefined => {
  const coordinate = spec.coordinate as Record<string, unknown> | undefined;
  const value = coordinate?.[channel];
  return typeof value === 'string' ? value : undefined;
};

/** 收集使用指定 scale 的 mark channel */
const scaleChannelsOf = (spec: IRPlot, scaleName: string): NonNullable<PlotScaleLineage['channels']> =>
  spec.marks.flatMap((mark, markIndex) =>
    (markEncodingFields(mark) ?? [])
      .filter(binding => (binding.scale ?? coordinateScaleNameOf(spec, binding.channel)) === scaleName)
      .map(binding => ({
        markIndex,
        channel: binding.channel,
        field: binding.field,
      })),
  );

/** 生成 scale lineage 摘要 */
const scaleLineageOf = (spec: IRPlot, scales: Array<IRPlotScaleOperation> | undefined): Array<PlotScaleLineage> =>
  (scales ?? []).map(scale => {
    const record = scale as { name?: unknown; type?: unknown; domain?: unknown; range?: unknown };
    const name = typeof record.name === 'string' ? record.name : '';
    const domain = toJsonValue(record.domain);
    const range = toJsonValue(record.range);
    const channels = scaleChannelsOf(spec, name);
    return {
      name,
      type: typeof record.type === 'string' ? record.type : '',
      ...(domain !== undefined ? { domain } : {}),
      ...(range !== undefined ? { range } : {}),
      ...(channels.length > 0 ? { channels } : {}),
    };
  });

/** 从 locator meta 生成 datum source identity */
const sourceIdentityOfMeta = (meta: Record<string, unknown>): DataSourceIdentity | undefined => {
  const sourceIndices = meta.sourceIndices;
  if (Array.isArray(sourceIndices) && sourceIndices.every((value): value is number => typeof value === 'number')) {
    const visible = sourceIndices.slice(0, 20);
    return {
      mode: 'summary',
      count: sourceIndices.length,
      indices: visible,
      truncated: visible.length < sourceIndices.length,
    };
  }
  const sourceIndex = meta.sourceIndex;
  return typeof sourceIndex === 'number'
    ? { mode: 'summary', count: 1, indices: [sourceIndex], truncated: false }
    : undefined;
};

/** 用 plot spec 与数据集生成 runtime-only lineage artifact */
const buildPlotLineage = (
  spec: IRPlot,
  options: PlotLineageLowerOptions,
  dataArtifact: PlotDataArtifact,
): PlotLineageLowerResult['lineage'] => {
  const lineageOptions = resolvePlotLineageOptions(options.lineage);
  const rootLineage = dataArtifact.rootLineage;
  const markLineages = dataArtifact.markLineages;
  if (rootLineage === undefined || markLineages === undefined) {
    throw new RetikzPlotError('plot lineage: lowering data artifact is missing lineage events');
  }
  const rootKinds = operationKindsOf(spec.transform);
  const markData: Array<PlotMarkDataLineage> = [];
  const marks: Array<PlotMarkLineage> = [];
  const hostMetadata =
    lineageOptions.hostMetadata === false
      ? undefined
      : hostMetadataOf(lineageOptions.hostMetadata, options.hostLineageMetadata);

  spec.marks.forEach((mark, markIndex) => {
    const transform = (mark as { transform?: Array<IRPlotTransform> }).transform;
    markData.push({ markIndex, events: markLineages[markIndex]?.events ?? [] });

    const markLineage: PlotMarkLineage = {
      markIndex,
      markType: mark.type,
    };
    const markId = (mark as { id?: unknown }).id;
    if (lineageOptions.markIdentity && typeof markId === 'string') markLineage.markId = markId;
    if (lineageOptions.markEncoding) markLineage.encoding = markEncodingFields(mark);
    if (lineageOptions.transformScopes) {
      markLineage.transformScope = { root: rootKinds, mark: operationKindsOf(transform) };
    }
    if (lineageOptions.rowValues !== false) {
      const markRows = dataArtifact.rootMarkDataViews[markIndex]?.dataView.rows ?? dataArtifact.rootDataView.rows;
      markLineage.rowValues = sampleRows(markRows, lineageOptions.rowValues);
    }
    marks.push(markLineage);
  });

  return {
    ...(spec.id !== undefined ? { plotId: spec.id } : {}),
    dataReference: spec.data.reference,
    data: { root: rootLineage, marks: markData },
    marks,
    ...(lineageOptions.scaleMappings ? { scales: scaleLineageOf(spec, spec.scales) } : {}),
    ...(lineageOptions.layoutContext ? { layout: layoutLineageOf(spec) } : {}),
    ...(hostMetadata !== undefined ? { hostMetadata } : {}),
  };
};

/** 下沉单个 plot spec 并返回 runtime-only lineage artifact */
export const lowerPlotWithLineage = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  options: PlotLineageLowerOptions = {},
): PlotLineageLowerResult => {
  const lineageOptions = resolvePlotLineageOptions(options.lineage);
  const lowered = lowerPlotWithDataArtifact(spec, datasets, options, undefined, lineageOptions.data);
  return { children: [lowered.child], lineage: buildPlotLineage(spec, options, lowered.dataArtifact) };
};

/** 创建带 lineage 的 plot locator */
export const createPlotLineageLocator = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  options: PlotLineageLowerOptions = {},
): PlotLineageLocator => {
  const lineageOptions = resolvePlotLineageOptions(options.lineage);
  const lowered = lowerPlotWithDataArtifact(
    spec,
    datasets,
    { ...options, provenance: true, datumProvenance: true },
    undefined,
    lineageOptions.data,
  );
  const locator = buildPlotLocatorFromDataArtifact(spec, options, lowered);
  const lineage = buildPlotLineage(spec, options, lowered.dataArtifact);

  const withLocatorAnchor = <T extends PlotDatumLineage | PlotSeriesLineage>(
    value: T,
    address: string,
    anchor: NonNullable<ReturnType<typeof locator.datum>>,
  ): T => {
    if (!lineageOptions.locatorAnchors) return value;
    return { ...value, locatorAnchor: { address, anchor } };
  };

  const wrapDatum = (
    address: string,
    anchor: ReturnType<typeof locator.datum> | null,
  ): PlotLineageAnchorResolution | null => {
    if (anchor === null) return null;
    const meta = anchor.meta as Record<string, unknown>;
    if (typeof meta.markIndex !== 'number' || typeof meta.transformedIndex !== 'number') return null;
    const datumLineage: PlotDatumLineage = {
      queryKind: 'datum',
      markIndex: meta.markIndex,
      transformedIndex: meta.transformedIndex,
      sourceIdentity: sourceIdentityOfMeta(meta),
      mark: lineage.marks.find(mark => mark.markIndex === meta.markIndex),
    };
    return { anchor, lineage: withLocatorAnchor(datumLineage, address, anchor) };
  };

  const wrapSeries = (
    address: string,
    seriesValue: string | number,
    anchor: ReturnType<typeof locator.series> | null,
  ): PlotLineageAnchorResolution | null => {
    if (anchor === null) return null;
    const markIndex = anchor.meta.markIndex;
    const seriesLineage: PlotSeriesLineage = {
      queryKind: 'series',
      ...(typeof markIndex === 'number'
        ? { markIndex, mark: lineage.marks.find(mark => mark.markIndex === markIndex) }
        : {}),
      seriesValue,
    };
    return { anchor, lineage: withLocatorAnchor(seriesLineage, address, anchor) };
  };

  const prefix = spec.id === undefined ? '' : `${spec.id}.`;
  const seriesValueOfAddress = (address: string): string | undefined => {
    const parts = address.split('.');
    const rest = spec.id !== undefined && parts[0] === spec.id ? parts.slice(1) : parts;
    return rest.length === 2 && rest[0] === 'series' ? rest[1] : undefined;
  };

  return {
    datum: (transformedIndex, locatorOptions) =>
      wrapDatum(`${prefix}datum.${transformedIndex}`, locator.datum(transformedIndex, locatorOptions)),
    series: (value, locatorOptions) =>
      wrapSeries(`${prefix}series.${String(value)}`, value, locator.series(value, locatorOptions)),
    resolve: address => {
      const seriesValue = seriesValueOfAddress(address);
      return seriesValue === undefined
        ? wrapDatum(address, locator.resolve(address))
        : wrapSeries(address, seriesValue, locator.resolve(address));
    },
  };
};
