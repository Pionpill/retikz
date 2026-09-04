import type { IRChild, IRJsonObject, IRNode, IRPath, IRScope } from '@retikz/core';
import type { ExternalDatasets, ExternalRow } from '@retikz/data';

import { readSourceIndex, readSourceIndices, resolveFieldPath } from '@retikz/data';

import type {
  CoordinateFrame,
  IntervalContext,
  PlotAnchorResolution,
  PlotFacetLocatorOptions,
  PlotLocator,
  PlotLocatorOptions,
} from '../../contract';
import type { ProvenanceContext } from '../../contract';
import type { IRPlot, IRPlotMark } from '../../schemas';
import type { LowerPlotsOptions, MarkDataView } from '../expand';
import type { PlotDataArtifactLowerResult } from '../expand/lower';

import { cellGeometryAnchor, isRenderableCellGeometry } from '../../contract';
import { datumMeta } from '../../contract';
import { buildIntervalContext, intervalCellGeometry, resolveMarkRegistry } from '../../providers';
import { coordinateScopeIdOf } from '../../resolve/composition';
import { datumAnchor } from '../../resolve/mark';
import { isBuiltinMark, PlotMark } from '../../schemas';
import { DEFAULT_PLOT_HEIGHT, DEFAULT_PLOT_WIDTH } from '../../shared';
import { lowerPlotWithDataArtifact } from '../expand/lower';

type PlotFacetLocatorValue = Exclude<PlotFacetLocatorOptions['row'], undefined>;

/** 取某 mark 的 series 字段名（无则 undefined）；只有 path / interval 含 series */
const seriesFieldOf = (mark: IRPlotMark): string | undefined =>
  mark.type === PlotMark.Path || mark.type === PlotMark.Interval ? mark.series : undefined;

type RenderDatumEntry = PlotAnchorResolution & {
  transformedIndex: number;
  markIndex: number;
};

type RenderSeriesEntry = PlotAnchorResolution & {
  markIndex: number;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';
const isPath = (child: IRChild): child is IRPath => child.type === 'path';

const mergeMeta = (parent: IRJsonObject, own: IRJsonObject | undefined): IRJsonObject => ({
  ...parent,
  ...(own ?? {}),
});

const translateOffsetOf = (scope: IRScope): [number, number] => {
  let x = 0;
  let y = 0;
  for (const transform of scope.transforms ?? []) {
    if (transform.kind !== 'translate') continue;
    x += transform.x;
    y += transform.y;
  }
  return [x, y];
};

/** 从已下沉datum Node读取与mark语义一致的锚点；sector使用环楔中心而非Node圆心 */
const renderDatumPositionOf = (node: IRNode, offset: [number, number]): [number, number] | null => {
  if (!Array.isArray(node.position)) return null;
  const center: [number, number] = [node.position[0] + offset[0], node.position[1] + offset[1]];
  const shape = node.shape as
    | {
        type?: string;
        params?: { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };
      }
    | undefined;
  if (shape?.type !== 'sector' || shape.params === undefined) return center;
  return cellGeometryAnchor({ kind: 'sector', center, ...shape.params });
};

const collectRenderDatumEntries = (
  child: IRChild,
  parentMeta: IRJsonObject = {},
  offset: [number, number] = [0, 0],
): Array<RenderDatumEntry> => {
  if (isNode(child)) {
    const meta = mergeMeta(parentMeta, child.meta);
    const transformedIndex = meta.transformedIndex;
    const markIndex = meta.markIndex;
    if (typeof transformedIndex !== 'number' || !Number.isInteger(transformedIndex)) return [];
    if (typeof markIndex !== 'number' || !Number.isInteger(markIndex)) return [];
    const position = renderDatumPositionOf(child, offset);
    if (position === null) return [];
    const entry: RenderDatumEntry = {
      position,
      meta,
      transformedIndex,
      markIndex,
    };
    return child.id !== undefined ? [{ ...entry, id: child.id }] : [entry];
  }
  if (!isScope(child)) return [];
  const meta = mergeMeta(parentMeta, child.meta);
  const [dx, dy] = translateOffsetOf(child);
  const nextOffset: [number, number] = [offset[0] + dx, offset[1] + dy];
  return child.children.flatMap(item => collectRenderDatumEntries(item, meta, nextOffset));
};

/** 从已下沉 Path endpoint 收集带 series / facet context 的结构锚点 */
const collectRenderSeriesEntries = (
  child: IRChild,
  parentMeta: IRJsonObject = {},
  offset: [number, number] = [0, 0],
): Array<RenderSeriesEntry> => {
  if (isPath(child)) {
    const meta = mergeMeta(parentMeta, child.meta);
    const markIndex = meta.markIndex;
    const series = meta.series;
    if (typeof markIndex !== 'number' || !Number.isInteger(markIndex)) return [];
    if (typeof series !== 'string' && typeof series !== 'number') return [];
    return child.children.flatMap(step => {
      if (!('to' in step) || !Array.isArray(step.to)) return [];
      const [x, y] = step.to;
      if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) return [];
      return [{ position: [x + offset[0], y + offset[1]], meta, markIndex } satisfies RenderSeriesEntry];
    });
  }
  if (!isScope(child)) return [];
  const meta = mergeMeta(parentMeta, child.meta);
  const [dx, dy] = translateOffsetOf(child);
  const nextOffset: [number, number] = [offset[0] + dx, offset[1] + dy];
  return child.children.flatMap(item => collectRenderSeriesEntries(item, meta, nextOffset));
};

const hasContextOptions = (opts: PlotLocatorOptions | undefined): boolean =>
  opts?.coordinateView !== undefined || opts?.facet !== undefined || opts?.track !== undefined;

const facetMatches = (meta: IRJsonObject, facet: PlotFacetLocatorOptions | undefined): boolean => {
  if (facet === undefined) return true;
  const found = meta.facet;
  if (found === null || typeof found !== 'object' || Array.isArray(found)) return false;
  const facetMeta = found;
  if (facetMeta.id !== facet.id) return false;
  const valueMatches = (foundValue: unknown, expected: PlotFacetLocatorValue): boolean => {
    const foundValues = Array.isArray(foundValue) ? foundValue : [foundValue];
    const expectedValues = Array.isArray(expected) ? expected : [expected];
    if (Array.isArray(expected)) {
      return JSON.stringify(foundValues) === JSON.stringify(expectedValues);
    }
    return foundValues.some(value => JSON.stringify(value) === JSON.stringify(expected));
  };
  if (facet.row !== undefined && !valueMatches(facetMeta.row, facet.row)) return false;
  if (facet.column !== undefined && !valueMatches(facetMeta.column, facet.column)) return false;
  return true;
};

const trackMatches = (meta: IRJsonObject, track: PlotLocatorOptions['track']): boolean => {
  if (track === undefined) return true;
  return meta.track === track;
};

const contextMatches = (meta: IRJsonObject, opts: PlotLocatorOptions | undefined): boolean => {
  if (opts?.coordinateView !== undefined && meta.coordinateView !== opts.coordinateView) return false;
  if (!trackMatches(meta, opts?.track)) return false;
  return facetMatches(meta, opts?.facet);
};

/** 从一次Plot lowering的数据artifact构建locator */
export const buildPlotLocatorFromDataArtifact = (
  spec: IRPlot,
  options: LowerPlotsOptions,
  lowered: PlotDataArtifactLowerResult,
): PlotLocator => {
  const renderEntries = collectRenderDatumEntries(lowered.child);
  const renderSeriesEntries = collectRenderSeriesEntries(lowered.child);
  const { compositionResolution, frameByCoordinateScopeId, markDataViews, rootMarkDataViews } = lowered.dataArtifact;
  const markRegistry = resolveMarkRegistry(options.markDefinitions);

  // path datum没有独立Node；仅在实际lowering只有一个结构scope时，复用artifact的DataView与frame计算结构锚点
  const structuralMarkDataViewOf = (markIndex: number): MarkDataView | undefined => {
    if (compositionResolution.facets.length > 0) return undefined;
    const candidates = markDataViews.filter(markDataView => markDataView.markIndex === markIndex);
    return candidates.length === 1 ? candidates[0] : undefined;
  };
  const structuralFrameOf = (markDataView: MarkDataView): CoordinateFrame | undefined => {
    const coordinateScopeId = coordinateScopeIdOf(
      markDataView.mark,
      compositionResolution.coordinateScopes.defaultScope,
    );
    return frameByCoordinateScopeId.get(coordinateScopeId);
  };

  // path结构锚点合成同构meta；point / interval直接返回实际Scene entry的meta与id
  const metaContext: ProvenanceContext = {
    plotId: spec.id,
    dataReference: spec.data.reference,
    datumProvenance: true,
    datumIdField: options.datumIdField,
  };
  const defaultMarkIndex = 0;
  const anchorResolutionOf = (entry: RenderDatumEntry): PlotAnchorResolution =>
    entry.id === undefined
      ? { position: entry.position, meta: entry.meta }
      : { position: entry.position, meta: entry.meta, id: entry.id };
  const matchingDatumEntries = (
    markIndex: number | undefined,
    transformedIndex: number,
    opts: PlotLocatorOptions | undefined,
  ): Array<RenderDatumEntry> =>
    renderEntries.filter(
      entry =>
        (markIndex === undefined || entry.markIndex === markIndex) &&
        entry.transformedIndex === transformedIndex &&
        contextMatches(entry.meta, opts),
    );

  /** path mark没有独立datum Node时，从本次lowering artifact投影结构锚点 */
  const structuralPathAnchorAt = (
    markIndex: number,
    transformedIndex: number,
  ): { position: [number, number]; row: ExternalRow; mark: IRPlotMark } | null => {
    const markDataView = structuralMarkDataViewOf(markIndex);
    if (markDataView === undefined || !isBuiltinMark(markDataView.mark) || markDataView.mark.type !== PlotMark.Path) {
      return null;
    }
    const frame = structuralFrameOf(markDataView);
    if (frame === undefined) return null;
    const rows = markDataView.dataView.rows;
    if (!Number.isInteger(transformedIndex) || transformedIndex < 0 || transformedIndex >= rows.length) return null;
    const row = rows[transformedIndex];
    const position = datumAnchor(markDataView.mark, row, frame, { registry: markRegistry });
    return position === null ? null : { position, row, mark: markDataView.mark };
  };

  const datum: PlotLocator['datum'] = (transformedIndex, opts) => {
    if (!Number.isInteger(transformedIndex) || transformedIndex < 0) return null;
    const hasContext = hasContextOptions(opts);
    const markIndex = opts?.markIndex ?? (hasContext ? undefined : defaultMarkIndex);
    const entries = matchingDatumEntries(markIndex, transformedIndex, opts);
    if (entries.length === 1) return anchorResolutionOf(entries[0]);
    if (entries.length > 1 || hasContext || markIndex === undefined) return null;
    const hit = structuralPathAnchorAt(markIndex, transformedIndex);
    if (!hit) return null;
    const seriesField = seriesFieldOf(hit.mark);
    const seriesValue = seriesField ? resolveFieldPath(hit.row, seriesField) : undefined;
    const meta = datumMeta(
      metaContext,
      hit.mark.type,
      markIndex,
      transformedIndex,
      readSourceIndex(hit.row),
      seriesValue,
      readSourceIndices(hit.row),
    );
    return { position: hit.position, meta };
  };

  const series: PlotLocator['series'] = (value, opts) => {
    const hasContext = hasContextOptions(opts);
    const markIndex = opts?.markIndex ?? (hasContext ? undefined : defaultMarkIndex);
    const entries = [...renderEntries, ...renderSeriesEntries].filter(entry => {
      if ((markIndex !== undefined && entry.markIndex !== markIndex) || !contextMatches(entry.meta, opts)) {
        return false;
      }
      const seriesValue = entry.meta.series;
      return seriesValue === value || String(seriesValue) === String(value);
    });
    if (entries.length > 0) {
      const contexts = new Set(
        entries.map(entry =>
          JSON.stringify({
            coordinateView: entry.meta.coordinateView,
            arrangement: entry.meta.arrangement,
            track: entry.meta.track,
            facet: entry.meta.facet,
          }),
        ),
      );
      if (!hasContext && contexts.size > 1) return null;
      const position: [number, number] = [
        entries.reduce((sum, entry) => sum + entry.position[0], 0) / entries.length,
        entries.reduce((sum, entry) => sum + entry.position[1], 0) / entries.length,
      ];
      return { position, meta: entries[entries.length - 1].meta };
    }
    if (hasContext || markIndex === undefined) return null;
    const markDataView = structuralMarkDataViewOf(markIndex);
    if (markDataView === undefined || !isBuiltinMark(markDataView.mark)) return null;
    const mark = markDataView.mark;
    const seriesField = seriesFieldOf(mark);
    if (seriesField === undefined) return null;
    const frame = structuralFrameOf(markDataView);
    if (frame === undefined) return null;
    const rows = rootMarkDataViews.find(rootView => rootView.markIndex === markIndex)?.dataView.rows;
    if (rows === undefined) return null;
    const intervalContext: IntervalContext | undefined =
      mark.type === PlotMark.Interval ? buildIntervalContext(mark, frame, rows) : undefined;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const row of rows) {
      // 系列值匹配：先精确相等，再宽松字符串比对（resolve 的 '5' 字符串 token 匹配数值 5；#4）
      const fieldValue = resolveFieldPath(row, seriesField);
      if (fieldValue !== value && String(fieldValue) !== String(value)) continue;
      const position =
        mark.type === PlotMark.Interval
          ? (() => {
              const geometry = intervalCellGeometry(mark, row, frame, intervalContext);
              return geometry === null || !isRenderableCellGeometry(geometry) ? null : cellGeometryAnchor(geometry);
            })()
          : datumAnchor(mark, row, frame, { registry: markRegistry }, intervalContext);
      if (!position) continue;
      sumX += position[0];
      sumY += position[1];
      count++;
    }
    if (count === 0) return null;
    const meta: IRJsonObject = {
      source: 'plot',
      dataReference: spec.data.reference,
      mark: mark.type,
      markIndex,
      series: typeof value === 'string' || typeof value === 'number' ? value : String(value),
    };
    return { position: [sumX / count, sumY / count], meta };
  };

  const resolve: PlotLocator['resolve'] = address => {
    if (typeof address !== 'string' || address.length === 0) return null;
    const parts = address.split('.');
    // 形态：'<plotId>.datum.<i>' / '<plotId>.series.<v>'；root 无 id 时 'datum.<i>' / 'series.<v>'
    let rest: Array<string>;
    if (spec.id !== undefined && parts[0] === spec.id) {
      rest = parts.slice(1);
    } else if (spec.id === undefined) {
      rest = parts;
    } else {
      return null; // 有 plotId 但前缀不符
    }
    if (rest[0] === 'view' && rest.length === 4 && rest[2] === 'datum') {
      const index = Number(rest[3]);
      if (!Number.isInteger(index)) return null;
      return datum(index, { coordinateView: rest[1] });
    }
    if (rest[0] === 'track' && rest.length === 4 && rest[2] === 'datum') {
      const index = Number(rest[3]);
      if (!Number.isInteger(index)) return null;
      return datum(index, { track: rest[1] });
    }
    if (rest[0] === 'facet' && rest.length === 6 && rest[4] === 'datum') {
      const index = Number(rest[5]);
      if (!Number.isInteger(index)) return null;
      if (rest[2] === 'row') return datum(index, { facet: { id: rest[1], row: rest[3] } });
      if (rest[2] === 'column') return datum(index, { facet: { id: rest[1], column: rest[3] } });
      return null;
    }
    if (rest.length !== 2) return null;
    const [kind, token] = rest;
    if (kind === 'datum') {
      const index = Number(token);
      if (!Number.isInteger(index)) return null;
      return datum(index);
    }
    if (kind === 'series') {
      return series(token);
    }
    return null;
  };

  return { datum, series, resolve };
};

/**
 * 用与lowerPlots同一份spec、datasets与options创建locator
 * @description locator直接消费一次完整lowering的Scene与runtime artifact，避免重放prepare、transform与frame链
 */
export const createPlotLocator = (
  spec: IRPlot,
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): PlotLocator => {
  const width = options.width ?? DEFAULT_PLOT_WIDTH;
  const height = options.height ?? DEFAULT_PLOT_HEIGHT;

  // 数据集缺失 / 尺寸非法时给出空 locator（解析全 null），而非抛——保 resolve 永不 throw 的契约
  const dataset = Object.hasOwn(datasets, spec.data.reference) ? datasets[spec.data.reference] : undefined;
  const sizeValid = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
  if (!dataset || !sizeValid) {
    return {
      datum: () => null,
      series: () => null,
      resolve: () => null,
    };
  }

  const lowered = lowerPlotWithDataArtifact(spec, datasets, {
    ...options,
    width,
    height,
    provenance: true,
    datumProvenance: true,
  });
  return buildPlotLocatorFromDataArtifact(spec, options, lowered);
};
