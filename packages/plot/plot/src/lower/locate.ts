import type { IRJsonObject } from '@retikz/core';
import { type ExternalDatasets, type ExternalRow, type Mark, type PlotSpec } from '../ir';
import { datumAnchor } from './anchor';
import { DEFAULT_FONT_SIZE } from './layout';
import { type LowerPlotsOptions, resolveFrame } from './expand';
import type { CoordinateFrame } from './project';
import { type ProvenanceContext, datumMeta, readSourceIndex, slug, tagSourceIndex } from './provenance';
import { applyTransforms } from './transform';
import { resolveFieldPath } from './field';

/** 默认整图尺寸（与 expand.ts 对齐，保 locator 投影与 lowering 一致） */
const DEFAULT_WIDTH = 480;
const DEFAULT_HEIGHT = 300;

/**
 * 解析结果：逻辑地址在 scene 里的落点 + 来源 meta +（若已绑）可连接 id
 * @description position 与 lowering 摆放一致（共享 datumAnchor）；meta 即便 lowering 未开 datumProvenance 也按需合成；
 *   id 仅在 ADR-01 给该元素绑了具名 id（datumIdField 命中）时回填，否则省略。
 */
export type ResolvedAnchor = {
  /** 该 datum / series 的锚点屏幕位置（user units，与 lowering 摆放一致） */
  position: [number, number];
  /** 来源 meta（与 ADR-01 per-datum meta 同构；series 携带 {source,dataReference,mark,markIndex,series}） */
  meta: IRJsonObject;
  /** 若给该元素绑了具名 id（datumIdField 命中），回填；否则省略 */
  id?: string;
};

/**
 * plot locator：对一份 spec + 数据 + 渲染选项的确定性正向解析器（纯函数、无副作用、不进 IR）
 * @description 命中预演：把逻辑地址映射到 scene 落点 + 来源 meta，与实际渲染逐点一致（复用 ADR-01 resolveFrame + datumAnchor）。
 */
export type PlotLocator = {
  /**
   * 按 transformedIndex（transform 后行序 = lowering 迭代序 = 渲染序）解析 datum 锚点。O(1)。
   * @description markIndex 缺省取首个 mark；越界 / 该行未被渲染（投影无效 / 零尺寸被跳过）→ null。
   */
  datum: (transformedIndex: number, opts?: { markIndex?: number }) => ResolvedAnchor | null;
  /**
   * 按 series 值解析其区域锚点（该 series 所有已渲染 datum 锚点的 centroid）。O(k)。
   * @description 无此 series 值 / 全被跳过 → null；meta 携带 series。
   */
  series: (value: string | number, opts?: { markIndex?: number }) => ResolvedAnchor | null;
  /**
   * 按点路径串解析：'<plotId>.datum.<transformedIndex>' / '<plotId>.series.<value>'。
   * @description root 无 id 时支持无前缀形式 'datum.<i>' / 'series.<v>'；不匹配 / plotId 不符 / 非法段 → null（不抛）。
   */
  resolve: (address: string) => ResolvedAnchor | null;
};

/** 取某 mark 的 series 字段名（无则 undefined）；只有 line / interval / area 含 series */
const seriesFieldOf = (mark: Mark): string | undefined =>
  mark.type === 'line' || mark.type === 'interval' || mark.type === 'area' ? mark.series : undefined;

/**
 * 用与 lowerPlots 同一份 spec + datasets + options 建 locator（复用 ADR-01 resolveFrame，投影单一真源）
 * @description 行构造与 expandPlot 一致：先 tagSourceIndex（克隆、不污染入参）供 sourceIndex 回指，再 applyTransforms；
 *   frame 走同一 resolveFrame。locator 纯函数：不产 IR、不注册 core 元素、不改 spec / datasets。
 */
export const createPlotLocator = (spec: PlotSpec, datasets: ExternalDatasets, options: LowerPlotsOptions = {}): PlotLocator => {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;

  // 数据集缺失 / 尺寸非法时给出空 locator（解析全 null），而非抛——保 resolve 永不 throw 的契约。
  const dataset = spec.data.reference in datasets ? datasets[spec.data.reference] : undefined;
  const sizeValid = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
  if (!dataset || !sizeValid) {
    const empty: PlotLocator = {
      datum: () => null,
      series: () => null,
      resolve: () => null,
    };
    return empty;
  }

  // 与 expandPlot 同序：tagSourceIndex（clone，不动入参）→ applyTransforms。locator 总要 sourceIndex 供 meta 合成。
  const rows = applyTransforms(tagSourceIndex(dataset), spec.transform);

  // frame 复用 resolveFrame：投影几何与 provenance 无关（provenance 只影响 guide 层 id/meta），故传 undefined。
  const { frame }: { frame: CoordinateFrame } = resolveFrame({
    node: spec,
    rows,
    width,
    height,
    fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
    margin: options.margin,
    provenance: undefined,
  });

  // 合成 meta 用的上下文（locator 始终按需合成同构 meta，与 lowering 是否开 datumProvenance 无关）
  const metaContext: ProvenanceContext = {
    plotId: spec.id,
    dataReference: spec.data.reference,
    datumProvenance: true,
    datumIdField: options.datumIdField,
  };

  const markOf = (markIndex: number): Mark | undefined => spec.marks[markIndex];
  const defaultMarkIndex = 0;

  /** 合成某行的 datum id（datumIdField 设 + plotId 在 + 字段命中）→ `<plotId>.datum.<slug>`；否则 undefined */
  const datumIdOf = (row: ExternalRow): string | undefined => {
    if (options.datumIdField === undefined || spec.id === undefined) return undefined;
    const raw = resolveFieldPath(row, options.datumIdField);
    if (raw === undefined) return undefined;
    return `${spec.id}.datum.${slug(raw)}`;
  };

  /** 算某 (markIndex, transformedIndex) 的锚点（越界 / 未渲染 → null） */
  const anchorAt = (markIndex: number, transformedIndex: number): { position: [number, number]; row: ExternalRow; mark: Mark } | null => {
    const mark = markOf(markIndex);
    if (!mark) return null;
    if (!Number.isInteger(transformedIndex) || transformedIndex < 0 || transformedIndex >= rows.length) return null;
    const row = rows[transformedIndex];
    const position = datumAnchor(mark, row, frame);
    if (!position) return null;
    return { position, row, mark };
  };

  const datum: PlotLocator['datum'] = (transformedIndex, opts) => {
    const markIndex = opts?.markIndex ?? defaultMarkIndex;
    const hit = anchorAt(markIndex, transformedIndex);
    if (!hit) return null;
    const seriesField = seriesFieldOf(hit.mark);
    const seriesValue = seriesField ? resolveFieldPath(hit.row, seriesField) : undefined;
    const meta = datumMeta(metaContext, hit.mark.type, markIndex, transformedIndex, readSourceIndex(hit.row), seriesValue);
    const id = datumIdOf(hit.row);
    return id !== undefined ? { position: hit.position, meta, id } : { position: hit.position, meta };
  };

  const series: PlotLocator['series'] = (value, opts) => {
    const markIndex = opts?.markIndex ?? defaultMarkIndex;
    const mark = markOf(markIndex);
    if (!mark) return null;
    const seriesField = seriesFieldOf(mark);
    if (seriesField === undefined) return null;
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    for (const row of rows) {
      if (resolveFieldPath(row, seriesField) !== value) continue;
      const position = datumAnchor(mark, row, frame);
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
