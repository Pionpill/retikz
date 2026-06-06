import { type IRChild, type IRNode, type IRNodeDefault, type IRScope, type IRStep } from '@retikz/core';
import { type ExternalRow, type Mark, PlotCoordinate } from '../ir';
import { channelValue, compareByPath, isFiniteNumber, resolveFieldPath } from './field';
import type { CartesianFrame, CoordinateFrame } from './project';
import { inferCategoryDomain } from './scale';

/** 散点 glyph 默认直径（user units，已补偿 circle 外接） */
const POINT_SIZE = 10;
/** 折线默认描边宽度（user units） */
const LINE_STROKE_WIDTH = 2;
/** 柱默认 baseline（值域基准；alpha.3 固定 0，可配置留后续） */
const BAR_BASELINE = 0;
/** 无 color 编码时的回退填充 */
const DEFAULT_FILL = 'currentColor';

/** 行 → 颜色串（color 编码解析结果；undefined = 回退默认色）。由 expand 据 encoding.color 构造 */
export type ColorOf = (row: ExternalRow) => string | undefined;

/**
 * 把若干「已就位 node + 其颜色」按颜色分组，每色一子 Scope（fill 上提到子 Scope 的 nodeDefault）
 * @description 颜色不逐 node 写：N 行同色 → 一个子 Scope 设 fill，IR 体积 O(色数) 而非 O(行数)。
 *   每个子 Scope 的 nodeDefault 自包含完整 node 样式（避免嵌套 every-X 合并的歧义）。
 */
const colorGroupedScope = (
  placed: Array<{ color: string | undefined; node: IRNode }>,
  styleFor: (fill: string) => IRNodeDefault,
): IRScope => {
  const groups = new Map<string, Array<IRNode>>();
  for (const { color, node } of placed) {
    const fill = color ?? DEFAULT_FILL;
    const bucket = groups.get(fill);
    if (bucket) bucket.push(node);
    else groups.set(fill, [node]);
  }
  const children: Array<IRChild> = [...groups].map(([fill, nodes]) => ({
    type: 'scope',
    nodeDefault: styleFor(fill),
    children: nodes,
  }));
  return { type: 'scope', children };
};

/** 散点 node 样式（circle + padding0 + minimumSize；÷√2 补 circle 外接，使 POINT_SIZE 即真实直径） */
const pointStyle = (fill: string): IRNodeDefault => ({
  shape: 'circle',
  padding: 0,
  minimumSize: POINT_SIZE / Math.SQRT2,
  fill,
});

/**
 * 按坐标系角色解析一行的位置通道值 → [primaryValue, secondaryValue]（坐标系无关）
 * @description cartesian2D：primary=x、secondary=y；polar2D：primary←angle??x、secondary←radius??y。
 *   投影交给 frame.project，mark 不感知 cartesian / polar 差异。笛卡尔下的 angle/radius 误用已在 expand 拦截。
 */
const resolveRolePosition = (mark: Mark, row: ExternalRow, frame: CoordinateFrame): [unknown, unknown] => {
  if (frame.type === PlotCoordinate.Polar2D) {
    const primary = channelValue(mark.encoding.angle ?? mark.encoding.x, row);
    const secondary = channelValue(mark.encoding.radius ?? mark.encoding.y, row);
    return [primary, secondary];
  }
  return [channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)];
};

/** 柱 node 样式（rectangle + padding0 + 无描边，使 minimumWidth/Height 即真实柱尺寸） */
const barStyle = (fill: string): IRNodeDefault => ({ shape: 'rectangle', padding: 0, strokeWidth: 0, fill });

/** 散点：每行一个 circle Node（坐标系无关，经 frame.project 投影） */
const lowerPoint = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf?: ColorOf): IRChild | null => {
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const [primaryValue, secondaryValue] = resolveRolePosition(mark, row, frame);
    const point = frame.project(primaryValue, secondaryValue);
    if (!point) continue;
    placed.push({ color: colorOf?.(row), node: { type: 'node', position: point } });
  }
  if (placed.length === 0) return null;
  // 无 color：单图层，样式上提到 nodeDefault（守 alpha.1 结构）；有 color：每色一子 Scope
  if (!colorOf) return { type: 'scope', nodeDefault: pointStyle(DEFAULT_FILL), children: placed.map(p => p.node) };
  return colorGroupedScope(placed, pointStyle);
};

/** 把一组「已就位 node + 其颜色」收成图层（有 color 分子 Scope、无则单层 nodeDefault） */
const barLayer = (placed: Array<{ color: string | undefined; node: IRNode }>, colorOf?: ColorOf): IRScope =>
  colorOf ? colorGroupedScope(placed, barStyle) : { type: 'scope', nodeDefault: barStyle(DEFAULT_FILL), children: placed.map(p => p.node) };

/** 普通柱：x band 中心、宽 bandwidth、baseline→value */
const lowerPlainBars = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf: ColorOf | undefined, bandwidth: number): IRChild | null => {
  const yBase = frame.secondary.coordinate(BAR_BASELINE);
  if (!Number.isFinite(yBase)) return null;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const xCenter = frame.primary.coordinate(channelValue(mark.encoding.x, row));
    const yValue = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
    if (!Number.isFinite(xCenter) || !Number.isFinite(yValue)) continue;
    placed.push({
      color: colorOf?.(row),
      node: { type: 'node', position: [xCenter, (yBase + yValue) / 2], minimumWidth: bandwidth, minimumHeight: Math.abs(yBase - yValue) },
    });
  }
  return placed.length === 0 ? null : barLayer(placed, colorOf);
};

/** 分组柱（dodge）：band 内按系列切等分子带，系列 i 占第 i 子带 */
const lowerDodgedBars = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf: ColorOf | undefined, bandwidth: number): IRChild | null => {
  if (mark.type !== 'interval' || !mark.series) return null;
  const seriesField = mark.series;
  const yBase = frame.secondary.coordinate(BAR_BASELINE);
  if (!Number.isFinite(yBase)) return null;
  const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = bandwidth / subCount;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const xCenter = frame.primary.coordinate(channelValue(mark.encoding.x, row));
    const yValue = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
    if (!Number.isFinite(xCenter) || !Number.isFinite(yValue)) continue;
    const series = resolveFieldPath(row, seriesField);
    const index = (typeof series === 'string' || typeof series === 'number' ? seriesRank.get(series) : undefined) ?? 0;
    const subCenter = xCenter - bandwidth / 2 + (index + 0.5) * subWidth;
    placed.push({
      color: colorOf?.(row),
      node: { type: 'node', position: [subCenter, (yBase + yValue) / 2], minimumWidth: subWidth, minimumHeight: Math.abs(yBase - yValue) },
    });
  }
  return placed.length === 0 ? null : barLayer(placed, colorOf);
};

/** 堆叠柱：读 stack transform 派生的 y0 / y1，柱从 y0 画到 y1（缺字段抛清晰错误） */
const lowerStackedBars = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf: ColorOf | undefined, bandwidth: number): IRChild | null => {
  if (mark.type !== 'interval') return null;
  const y0Field = mark.y0Field ?? 'y0';
  const y1Field = mark.y1Field ?? 'y1';
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const v0 = resolveFieldPath(row, y0Field);
    const v1 = resolveFieldPath(row, y1Field);
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
      throw new Error(`lowerPlots: stacked interval requires numeric ${y0Field} / ${y1Field} fields (run the stack transform first)`);
    }
    const xCenter = frame.primary.coordinate(channelValue(mark.encoding.x, row));
    const top = frame.secondary.coordinate(v1);
    const bottom = frame.secondary.coordinate(v0);
    if (!Number.isFinite(xCenter) || !Number.isFinite(top) || !Number.isFinite(bottom)) continue;
    placed.push({
      color: colorOf?.(row),
      node: { type: 'node', position: [xCenter, (top + bottom) / 2], minimumWidth: bandwidth, minimumHeight: Math.abs(top - bottom) },
    });
  }
  return placed.length === 0 ? null : barLayer(placed, colorOf);
};

/** 区间柱：按 arrangement / series 分派普通 / dodge / stack 三种几何（cartesian-only） */
const lowerInterval = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'interval') return null;
  const bandwidth = frame.primary.bandwidth;
  if (mark.arrangement === 'stack') return lowerStackedBars(mark, rows, frame, colorOf, bandwidth);
  if (mark.series) return lowerDodgedBars(mark, rows, frame, colorOf, bandwidth);
  return lowerPlainBars(mark, rows, frame, colorOf, bandwidth);
};

/** 把一组数据行连成一条折线的 steps（按 order / 数据序）；<2 点返回 null（cartesian-only） */
const buildLineSteps = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame): Array<IRStep> | null => {
  const ordered = mark.type === 'line' && mark.order ? [...rows].sort((a, b) => compareByPath(a, b, mark.order as string)) : rows;
  const points = ordered
    .map(row => frame.project(channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)))
    .filter((point): point is [number, number] => point !== null);
  if (points.length < 2) return null;
  return [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
};

/** 折线：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（cartesian-only） */
const lowerLine = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'line') return null;
  if (mark.series) {
    const seriesField = mark.series;
    const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
    const paths: Array<IRChild> = [];
    for (const series of seriesValues) {
      const seriesRows = rows.filter(row => resolveFieldPath(row, seriesField) === series);
      const steps = buildLineSteps(mark, seriesRows, frame);
      if (!steps) continue;
      const stroke = colorOf?.(seriesRows[0]) ?? DEFAULT_FILL;
      paths.push({ type: 'path', stroke, children: steps });
    }
    return paths.length === 0 ? null : { type: 'scope', pathDefault: { strokeWidth: LINE_STROKE_WIDTH }, children: paths };
  }
  const steps = buildLineSteps(mark, rows, frame);
  if (!steps) return null;
  const colorValue = mark.encoding.color?.value;
  const stroke = colorValue !== undefined ? String(colorValue) : DEFAULT_FILL;
  return { type: 'scope', pathDefault: { stroke, strokeWidth: LINE_STROKE_WIDTH }, children: [{ type: 'path', children: steps }] };
};

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   一个 mark 会展成 N 个图元（N = 数据点数），任何能提到图层的东西——样式、默认值、共享上下文——都别逐元素重复写。
 *   color 编码时按颜色分子 Scope；series 把记录拆成多系列（多线 / 分组 / 堆叠柱）。无可绘制图元返回 null。
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf?: ColorOf): IRChild | null => {
  // point 坐标系无关，经 frame.project 投影
  if (mark.type === 'point') return lowerPoint(mark, rows, frame, colorOf);
  // interval / line 暂仅笛卡尔（polar sector / 弯弧路径在 ADR-02 / ADR-03）
  if (frame.type !== PlotCoordinate.Cartesian2D) {
    throw new Error(`lowerPlots: mark "${mark.type}" is not yet supported under the polar2D coordinate system (only point is)`);
  }
  if (mark.type === 'interval') return lowerInterval(mark, rows, frame, colorOf);
  return lowerLine(mark, rows, frame, colorOf);
};
