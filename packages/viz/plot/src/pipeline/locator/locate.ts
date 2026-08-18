import type { IRChild, IRJsonObject, IRNode, IRScope } from '@retikz/core';
import type { ExternalDatasets, ExternalRow } from '@retikz/data';

import { applyTransforms, readSourceIndex, readSourceIndices, tagSourceIndex } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';

import type {
  CoordinateFrame,
  IntervalContext,
  PlotAnchorResolution,
  PlotFacetLocatorOptions,
  PlotLocator,
  PlotLocatorOptions,
} from '../../contract';
import type { ProvenanceContext } from '../../contract';
import type { CoordinateResolveContext } from '../../resolve/coordinate';
import type { IRPlot, IRPlotMark, IRPlotMarkOperation } from '../../schemas';
import type { LowerPlotsOptions, MarkDataView } from '../expand';

import { cellGeometryAnchor, isRenderableCellGeometry } from '../../contract';
import { datumMeta } from '../../contract';
import { buildIntervalContext, intervalCellGeometry } from '../../providers';
import { resolveCoordinateRegistry } from '../../providers';
import { resolveCoordinateScopeRegistry } from '../../resolve/composition';
import { resolveCoordinateFrame } from '../../resolve/coordinate';
import { resolveGuideTicks, resolveVisibleGuideTicks } from '../../resolve/guide';
import { datumAnchor } from '../../resolve/mark';
import { isBuiltinMark, PlotGuide, PlotMark } from '../../schemas';
import { DEFAULT_FONT_SIZE, DEFAULT_PLOT_HEIGHT, DEFAULT_PLOT_WIDTH } from '../../shared';
import { applyMarkTransforms, lowerPlots, prepareRows } from '../expand';
import { legendReserveOf } from '../expand/legend';
import { lowerCustomAxis, lowerGuide } from '../guide';
import { createDatumIdRegistrar } from '../provenance';

type PlotFacetLocatorValue = Exclude<PlotFacetLocatorOptions['row'], undefined>;

/** 取某 mark 的 series 字段名（无则 undefined）；只有 path / interval 含 series */
const seriesFieldOf = (mark: IRPlotMark): string | undefined =>
  mark.type === PlotMark.Path || mark.type === PlotMark.Interval ? mark.series : undefined;

/** datum-bearing mark（展成独立可见 Node 的 mark）：point / interval（含 heatmap cell / sector，皆 interval）；自定义 mark 非 datum-bearing */
const isDatumBearing = (mark: IRPlotMarkOperation): mark is IRPlotMark =>
  isBuiltinMark(mark) && (mark.type === PlotMark.Point || mark.type === PlotMark.Interval);

type RenderDatumEntry = PlotAnchorResolution & {
  transformedIndex: number;
  markIndex: number;
};

const isScope = (child: IRChild): child is IRScope => child.type === 'scope';
const isNode = (child: IRChild): child is IRNode => child.type === 'node';

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
    const position = child.position;
    if (!Array.isArray(position)) return [];
    const [x, y] = position;
    const entry: RenderDatumEntry = {
      position: [x + offset[0], y + offset[1]],
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

const contextMatches = (meta: IRJsonObject, opts: PlotLocatorOptions | undefined): boolean => {
  if (opts?.coordinateView !== undefined && meta.coordinateView !== opts.coordinateView) return false;
  if (opts?.track !== undefined && meta.track !== opts.track) return false;
  return facetMatches(meta, opts?.facet);
};

/**
 * 用与 lowerPlots 同一份 spec + datasets + options 建 locator（复用 resolveFrame，投影单一真源）
 * @description 行构造与 expandPlot 一致：先 tagSourceIndex（克隆、不污染入参）供 sourceIndex 回指，再 applyTransforms；
 *   frame 走同一 resolveFrame。locator 纯函数：不产 IR、不注册 core 元素、不改 spec / datasets。
 *   datumIdField 设时在构建期跑 plot 级 registrar（与 lowering 同序、同查重）→ 同 spec+options 下 locator-build 抛 iff lowering 抛（#3）
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
    const empty: PlotLocator = {
      datum: () => null,
      series: () => null,
      resolve: () => null,
    };
    return empty;
  }

  // 与 expandPlot 共用 prepareRows（fieldMaps 校验 + 类型解析 + 归一化），保证 render 抛错 ⟺ locator 抛错
  // tagSourceIndex（clone，不动入参）→ prepareRows → applyTransforms，与 lowering 完全同序，否则 locator 落点漂移
  const ingested = tagSourceIndex(dataset);
  const { fieldTypes, normalized, transformRegistry, transformContext, scaleRegistry, markRegistry } = prepareRows(
    spec,
    datasets,
    options,
    ingested,
  );
  const rows = applyTransforms(normalized, spec.transform, transformRegistry, transformContext);
  const markDataViews: Array<MarkDataView> = spec.marks.map(mark => ({
    mark,
    rows: applyMarkTransforms(mark, rows, transformRegistry, transformContext),
  }));
  const rowsOfMark = (markIndex: number): Array<ExternalRow> => markDataViews[markIndex]?.rows ?? rows;
  const coordinateScopes = resolveCoordinateScopeRegistry(spec);
  const defaultCoordinate =
    spec.coordinate ?? coordinateScopes.scopes.find(scope => scope.id === coordinateScopes.defaultScope)?.coordinate;

  // frame 复用 resolveCoordinateFrame：投影几何与 provenance 无关（provenance 只影响 guide 层 id/meta），故传 undefined
  // scaleRegistry 与 lowering 同源（prepareRows 解析），保证 position 投影 parity
  const coordinateGuides = spec.guides ?? [];
  const coordinateContext: CoordinateResolveContext = {
    coordinate: defaultCoordinate,
    rows,
    fieldTypes,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance: undefined,
    coordinateRegistry: resolveCoordinateRegistry(options.coordinates),
    scaleRegistry,
    markDataViews,
    legendReserve: legendReserveOf(coordinateGuides.flatMap(guide => (guide.type === PlotGuide.Legend ? [guide] : []))),
    lowerGuide,
    lowerCustomAxis,
    resolveGuideTicks,
    resolveVisibleGuideTicks,
  };
  const { frame }: { frame: CoordinateFrame } = resolveCoordinateFrame(spec, coordinateContext);

  // 合成 meta 用的上下文（locator 始终按需合成同构 meta，与 lowering 是否开 datumProvenance 无关）
  const metaContext: ProvenanceContext = {
    plotId: spec.id,
    dataReference: spec.data.reference,
    datumProvenance: true,
    datumIdField: options.datumIdField,
  };

  // 每 mark 的 IntervalContext 一次性建（interval mark 锚点需要；其余 mark undefined）——与 lowering 同源（#1）
  const intervalContexts = new Map<number, IntervalContext>();
  const intervalContextOf = (markIndex: number, mark: IRPlotMarkOperation): IntervalContext | undefined => {
    if (!isBuiltinMark(mark) || mark.type !== PlotMark.Interval) return undefined;
    const cached = intervalContexts.get(markIndex);
    if (cached) return cached;
    const ctx = buildIntervalContext(mark, frame, rowsOfMark(markIndex));
    if (ctx) intervalContexts.set(markIndex, ctx);
    return ctx;
  };

  const markOf = (markIndex: number): IRPlotMarkOperation | undefined => spec.marks[markIndex];
  const defaultMarkIndex = 0;
  const anchorFor = (mark: IRPlotMark, row: ExternalRow, ctx: IntervalContext | undefined): [number, number] | null => {
    if (mark.type !== PlotMark.Interval) return datumAnchor(mark, row, frame, { registry: markRegistry }, ctx);
    const geometry = intervalCellGeometry(mark, row, frame, ctx);
    if (geometry === null || !isRenderableCellGeometry(geometry)) return null;
    return cellGeometryAnchor(geometry);
  };

  // #3：datumIdField 设时构建期跑 plot 级 registrar（与 lowering 同序：mark 序 × transformedIndex 序、
  //   行「已渲染」iff datumAnchor 非 null）。缺字段 / 重复 / slug 冲突 → 与 lowering 同样 fail loud；
  //   校验通过的 id 存表供 datumIdOf 查（locator-build 抛 iff lowering 抛）
  const validatedDatumIds = new Map<number, Map<number, string>>();
  if (options.datumIdField !== undefined && spec.id !== undefined) {
    const register = createDatumIdRegistrar(options.datumIdField, spec.id);
    spec.marks.forEach((mark, markIndex) => {
      if (!isDatumBearing(mark)) return;
      const ctx = intervalContextOf(markIndex, mark);
      const idsForMark = new Map<number, string>();
      const markRows = rowsOfMark(markIndex);
      for (let transformedIndex = 0; transformedIndex < markRows.length; transformedIndex++) {
        const row = markRows[transformedIndex];
        if (!anchorFor(mark, row, ctx)) continue; // 未渲染行不绑 id（与 lowering 一致）
        idsForMark.set(transformedIndex, register(row));
      }
      validatedDatumIds.set(markIndex, idsForMark);
    });
  }

  /** 查某 (markIndex, transformedIndex) 已校验的 datum id（datumIdField 未设 / 未绑 → undefined） */
  const datumIdOf = (markIndex: number, transformedIndex: number): string | undefined =>
    validatedDatumIds.get(markIndex)?.get(transformedIndex);

  let renderEntriesCache: Array<RenderDatumEntry> | undefined;
  const renderEntries = (): Array<RenderDatumEntry> => {
    if (renderEntriesCache !== undefined) return renderEntriesCache;
    const [definition] = lowerPlots(datasets, {
      ...options,
      width,
      height,
      provenance: true,
      datumProvenance: true,
    });
    const expanded = definition.expand(spec);
    renderEntriesCache = expanded.children.flatMap(child => collectRenderDatumEntries(child));
    return renderEntriesCache;
  };

  const contextualDatum = (
    transformedIndex: number,
    opts: PlotLocatorOptions | undefined,
  ): PlotAnchorResolution | null => {
    if (!Number.isInteger(transformedIndex) || transformedIndex < 0) return null;
    const found = renderEntries().find(entry => {
      if (entry.transformedIndex !== transformedIndex) return false;
      if (opts?.markIndex !== undefined && entry.markIndex !== opts.markIndex) return false;
      return contextMatches(entry.meta, opts);
    });
    if (found === undefined) return null;
    return found.id === undefined
      ? { position: found.position, meta: found.meta }
      : { position: found.position, meta: found.meta, id: found.id };
  };

  const contextualSeries = (
    value: string | number,
    opts: PlotLocatorOptions | undefined,
  ): PlotAnchorResolution | null => {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    let meta: IRJsonObject | undefined;
    for (const entry of renderEntries()) {
      if (opts?.markIndex !== undefined && entry.markIndex !== opts.markIndex) continue;
      if (!contextMatches(entry.meta, opts)) continue;
      const seriesValue = entry.meta.series;
      if (seriesValue !== value && String(seriesValue) !== String(value)) continue;
      sumX += entry.position[0];
      sumY += entry.position[1];
      count++;
      meta = entry.meta;
    }
    if (count === 0 || meta === undefined) return null;
    return { position: [sumX / count, sumY / count], meta };
  };

  /** 算某 (markIndex, transformedIndex) 的锚点（越界 / 未渲染 → null） */
  const anchorAt = (
    markIndex: number,
    transformedIndex: number,
  ): { position: [number, number]; row: ExternalRow; mark: IRPlotMark } | null => {
    const mark = markOf(markIndex);
    if (!mark || !isBuiltinMark(mark)) return null; // 自定义 mark 非 datum-bearing，locator 跳过
    const markRows = rowsOfMark(markIndex);
    if (!Number.isInteger(transformedIndex) || transformedIndex < 0 || transformedIndex >= markRows.length) return null;
    const row = markRows[transformedIndex];
    const position = anchorFor(mark, row, intervalContextOf(markIndex, mark));
    if (!position) return null;
    return { position, row, mark };
  };

  const datum: PlotLocator['datum'] = (transformedIndex, opts) => {
    if (hasContextOptions(opts)) return contextualDatum(transformedIndex, opts);
    const markIndex = opts?.markIndex ?? defaultMarkIndex;
    const hit = anchorAt(markIndex, transformedIndex);
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
    const id = datumIdOf(markIndex, transformedIndex);
    return id !== undefined ? { position: hit.position, meta, id } : { position: hit.position, meta };
  };

  const series: PlotLocator['series'] = (value, opts) => {
    if (hasContextOptions(opts)) return contextualSeries(value, opts);
    const markIndex = opts?.markIndex ?? defaultMarkIndex;
    const mark = markOf(markIndex);
    if (!mark || !isBuiltinMark(mark)) return null; // 自定义 mark 无内置 series 语义，locator 跳过
    const seriesField = seriesFieldOf(mark);
    if (seriesField === undefined) return null;
    const ctx = intervalContextOf(markIndex, mark);
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const row of rowsOfMark(markIndex)) {
      // 系列值匹配：先精确相等，再宽松字符串比对（resolve 的 '5' 字符串 token 匹配数值 5；#4）
      const fieldValue = resolveFieldPath(row, seriesField);
      if (fieldValue !== value && String(fieldValue) !== String(value)) continue;
      const position = anchorFor(mark, row, ctx);
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
