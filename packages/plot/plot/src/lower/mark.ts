import { type IRChild, type IRNode, type IRNodeDefault, type IRScope, type IRStep } from '@retikz/core';
import { type ExternalRow, type IntervalMark, type Mark, PlotCoordinate, PlotMark } from '../ir';
import { channelValue, compareByPath, isFiniteNumber, resolveFieldPath } from './field';
import { type CartesianFrame, type CoordinateFrame, type PolarFrame, type PolarVertex, densifyPolarSegments, toPolarVertex } from './project';
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
 * 取一行的位置通道值 → [xValue, yValue]（坐标系无关；投影交给 frame.project，frame 把 x/y 重解释为对应角色）
 * @description x/y 是唯一位置通道（坐标系决定其含义）；sector 无位置通道（角度来自累积界、半径常量）→ 不走此路径。
 */
const resolveRolePosition = (mark: Mark, row: ExternalRow): [unknown, unknown] =>
  mark.type === PlotMark.Sector ? [undefined, undefined] : [channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)];

/** 柱 node 样式（rectangle + padding0 + 无描边，使 minimumWidth/Height 即真实柱尺寸） */
const barStyle = (fill: string): IRNodeDefault => ({ shape: 'rectangle', padding: 0, strokeWidth: 0, fill });

/** 散点：每行一个 circle Node（坐标系无关，经 frame.project 投影） */
const lowerPoint = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf?: ColorOf): IRChild | null => {
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const [primaryValue, secondaryValue] = resolveRolePosition(mark, row);
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
const lowerPlainBars = (mark: IntervalMark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf: ColorOf | undefined, bandwidth: number): IRChild | null => {
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

/** sector node 样式（sector shape 自带几何，padding0 + 无描边，纯填充环楔） */
const sectorStyle = (fill: string): IRNodeDefault => ({ padding: 0, strokeWidth: 0, fill });

/** sector node 的 shape params（满足 core 硬约束 outerRadius>innerRadius：内外半径 swap 取 min/max） */
type SectorGeometry = { innerRadius: number; outerRadius: number; startAngle: number; endAngle: number };

/** 用一对半径 + 一对角度建 sector Node（半径 swap 保 outerRadius>innerRadius；position = 圆心） */
const sectorNode = (center: [number, number], geometry: SectorGeometry): IRNode => ({
  type: 'node',
  position: center,
  shape: {
    type: 'sector',
    params: {
      innerRadius: Math.min(geometry.innerRadius, geometry.outerRadius),
      outerRadius: Math.max(geometry.innerRadius, geometry.outerRadius),
      startAngle: geometry.startAngle,
      endAngle: geometry.endAngle,
    },
  },
});

/** 把一组「已就位 sector node + 其颜色」收成图层（有 color 分子 Scope、无则单层 nodeDefault） */
const sectorLayer = (placed: Array<{ color: string | undefined; node: IRNode }>, colorOf?: ColorOf): IRScope =>
  colorOf ? colorGroupedScope(placed, sectorStyle) : { type: 'scope', nodeDefault: sectorStyle(DEFAULT_FILL), children: placed.map(p => p.node) };

/**
 * interval 在 polar 下 → sector（径向柱 / 玫瑰）
 * @description 角度 = primary(angle band) 的类别角带 [center−bw/2, center+bw/2]；
 *   半径 = secondary(radius) 从 baseline(0) 到 value（编码值）。stack（径向堆叠）读 y0/y1 作内外半径；
 *   dodge（band 内多系列）把角带切等分子角带。负值/反向由 sectorNode swap 保 outerRadius>innerRadius。
 */
const lowerIntervalPolar = (mark: Mark, rows: Array<ExternalRow>, frame: PolarFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'interval') return null;
  const bandwidth = frame.primary.bandwidth;
  const stacked = mark.arrangement === 'stack';
  const seriesField = !stacked ? mark.series : undefined;
  const seriesValues = seriesField ? inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField))) : [];
  const seriesRank = new Map(seriesValues.map((series, index) => [series, index] as const));
  const subCount = seriesValues.length || 1;
  const subWidth = bandwidth / subCount;

  const innerBaseline = frame.secondary.coordinate(BAR_BASELINE);
  if (!Number.isFinite(innerBaseline)) return null;

  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const center = frame.primary.coordinate(channelValue(mark.encoding.x, row));
    if (!Number.isFinite(center)) continue;

    // 角带：dodge → 子角带；否则整角带
    let startAngle: number;
    let endAngle: number;
    if (seriesField) {
      const series = resolveFieldPath(row, seriesField);
      const index = (typeof series === 'string' || typeof series === 'number' ? seriesRank.get(series) : undefined) ?? 0;
      const subStart = center - bandwidth / 2 + index * subWidth;
      startAngle = subStart;
      endAngle = subStart + subWidth;
    } else {
      startAngle = center - bandwidth / 2;
      endAngle = center + bandwidth / 2;
    }

    // 半径：stack 读 y0/y1（径向堆叠）；否则 baseline → value
    let innerRadius: number;
    let outerRadius: number;
    if (stacked) {
      const y0Field = mark.y0Field ?? 'y0';
      const y1Field = mark.y1Field ?? 'y1';
      const v0 = resolveFieldPath(row, y0Field);
      const v1 = resolveFieldPath(row, y1Field);
      if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
        throw new Error(`lowerPlots: stacked interval requires numeric ${y0Field} / ${y1Field} fields (run the stack transform first)`);
      }
      innerRadius = frame.secondary.coordinate(v0);
      outerRadius = frame.secondary.coordinate(v1);
    } else {
      innerRadius = innerBaseline;
      outerRadius = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
    }
    if (!Number.isFinite(innerRadius) || !Number.isFinite(outerRadius)) continue;
    // 退化（高 0：outer==inner）跳过，避免 core sector 的 outerRadius>innerRadius 约束被违反
    if (Math.max(innerRadius, outerRadius) - Math.min(innerRadius, outerRadius) < 1e-9) continue;

    placed.push({ color: colorOf?.(row), node: sectorNode(frame.center, { innerRadius, outerRadius, startAngle, endAngle }) });
  }
  return placed.length === 0 ? null : sectorLayer(placed, colorOf);
};

/**
 * sector mark（饼图 / 环图）：读 transform 派生的累积角界，半径常量满铺
 * @description 角度 = primary(angle linear, domain [0,total] → range [startAngle,endAngle]) 投影累积界 startField/endField；
 *   半径常量铺满 [frame.innerRadius, frame.outerRadius]（环图内半径来自 coordinate.innerRadius）。
 *   缺累积界字段（未跑 stack transform）→ 抛清晰错误（与堆叠 interval 同）。
 */
const lowerSector = (mark: Mark, rows: Array<ExternalRow>, frame: PolarFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'sector') return null;
  const startField = mark.startField ?? 'y0';
  const endField = mark.endField ?? 'y1';
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (const row of rows) {
    const v0 = resolveFieldPath(row, startField);
    const v1 = resolveFieldPath(row, endField);
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
      throw new Error(`lowerPlots: sector mark requires numeric ${startField} / ${endField} cumulative bounds (run the stack transform first)`);
    }
    // 累积界倒退（段值为负）→ 角度跨 0、扇片比例失真且数据被静默歪曲；饼/环扇片不能为负，fail loud
    if (v1 < v0) {
      throw new Error(`lowerPlots: sector mark requires non-negative values (cumulative bound ${endField}=${v1} < ${startField}=${v0}); pie / donut slices cannot be negative`);
    }
    const startAngle = frame.primary.coordinate(v0);
    const endAngle = frame.primary.coordinate(v1);
    if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) continue;
    if (Math.abs(endAngle - startAngle) < 1e-9) continue;
    placed.push({
      color: colorOf?.(row),
      node: sectorNode(frame.center, { innerRadius: frame.innerRadius, outerRadius: frame.outerRadius, startAngle, endAngle }),
    });
  }
  return placed.length === 0 ? null : sectorLayer(placed, colorOf);
};

/** 区间柱：按 arrangement / series 分派普通 / dodge / stack 三种几何（cartesian-only） */
const lowerInterval = (mark: Mark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'interval') return null;
  const bandwidth = frame.primary.bandwidth;
  if (mark.arrangement === 'stack') return lowerStackedBars(mark, rows, frame, colorOf, bandwidth);
  if (mark.series) return lowerDodgedBars(mark, rows, frame, colorOf, bandwidth);
  return lowerPlainBars(mark, rows, frame, colorOf, bandwidth);
};

/** area mark 的默认 baseline（回边贴的值；cartesian = y 基线、polar = 径向内界方向） */
const AREA_BASELINE = 0;

/** 把若干屏幕点连成 move + line steps（按需尾部加 cycle 闭合）；点数 < 2 返回 null */
const pointsToSteps = (points: ReadonlyArray<[number, number]>, closed: boolean): Array<IRStep> | null => {
  if (points.length < 2) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  if (closed) steps.push({ type: 'step', kind: 'cycle' });
  return steps;
};

/** 按 order / 数据序排好一组行（line / area 共用连接顺序） */
const orderRows = (rows: Array<ExternalRow>, order: string | undefined): Array<ExternalRow> =>
  order ? [...rows].sort((a, b) => compareByPath(a, b, order)) : rows;

/**
 * 把一组有序行投影成上沿屏幕点（坐标系无关）
 * @description cartesian / polar 分类角轴 / closed 走弦（顶点直连）；polar 连续角轴段内采样弯弧。
 *   返回的点已滤除非有限投影（守 frame.project null 语义）。
 */
const buildOutlinePoints = (mark: Mark, ordered: Array<ExternalRow>, frame: CoordinateFrame, closed: boolean): Array<[number, number]> => {
  if (frame.type === PlotCoordinate.Polar2D && frame.continuousAngle && !closed) {
    const vertices = ordered
      .map(row => {
        const [primaryValue, secondaryValue] = resolveRolePosition(mark, row);
        return toPolarVertex(frame, primaryValue, secondaryValue);
      })
      .filter((vertex): vertex is PolarVertex => vertex !== null);
    return densifyPolarSegments(frame, vertices);
  }
  return ordered
    .map(row => {
      const [primaryValue, secondaryValue] = resolveRolePosition(mark, row);
      return frame.project(primaryValue, secondaryValue);
    })
    .filter((point): point is [number, number] => point !== null);
};

/** 把一组行连成一条折线的 steps（上沿投影 + 可选闭合）；<2 点返回 null */
const buildLineSteps = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, closed: boolean): Array<IRStep> | null =>
  pointsToSteps(buildOutlinePoints(mark, orderRows(rows, mark.type === 'line' || mark.type === 'area' ? mark.order : undefined), frame, closed), closed);

/** 折线：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（坐标系无关） */
const lowerLine = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'line') return null;
  const closed = mark.closed ?? false;
  if (mark.series) {
    const seriesField = mark.series;
    const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
    const paths: Array<IRChild> = [];
    for (const series of seriesValues) {
      const seriesRows = rows.filter(row => resolveFieldPath(row, seriesField) === series);
      const steps = buildLineSteps(mark, seriesRows, frame, closed);
      if (!steps) continue;
      const stroke = colorOf?.(seriesRows[0]) ?? DEFAULT_FILL;
      paths.push({ type: 'path', stroke, children: steps });
    }
    return paths.length === 0 ? null : { type: 'scope', pathDefault: { strokeWidth: LINE_STROKE_WIDTH }, children: paths };
  }
  const steps = buildLineSteps(mark, rows, frame, closed);
  if (!steps) return null;
  const colorValue = mark.encoding.color?.value;
  const stroke = colorValue !== undefined ? String(colorValue) : DEFAULT_FILL;
  return { type: 'scope', pathDefault: { stroke, strokeWidth: LINE_STROKE_WIDTH }, children: [{ type: 'path', children: steps }] };
};

/**
 * 把一组有序行投影成 baseline 回边屏幕点（沿同 primary 序，secondary 固定为 baseline，逆序）
 * @description cartesian：primary=x 不变、secondary=baseline；polar：θ 不变、r=radius(baseline)。逆序使其与上沿首尾相接成闭环。
 */
const buildBaselinePoints = (mark: Mark, ordered: Array<ExternalRow>, frame: CoordinateFrame, baseline: number): Array<[number, number]> => {
  const points: Array<[number, number]> = [];
  for (const row of ordered) {
    const [primaryValue] = resolveRolePosition(mark, row);
    const point = frame.project(primaryValue, baseline);
    if (point) points.push(point);
  }
  return points.reverse();
};

/** 把一个 area 的上沿 + baseline 回边连成可填充 Path 的 steps；上沿 < 2 点返回 null */
const buildAreaSteps = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, baseline: number): Array<IRStep> | null => {
  const ordered = orderRows(rows, mark.type === 'area' ? mark.order : undefined);
  const closed = mark.type === 'area' ? (mark.closed ?? false) : false;
  const top = buildOutlinePoints(mark, ordered, frame, closed);
  if (top.length < 2) return null;
  const bottom = buildBaselinePoints(mark, ordered, frame, baseline);
  const outline = [...top, ...bottom];
  return [
    { type: 'step', kind: 'move', to: outline[0] },
    ...outline.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
    { type: 'step', kind: 'cycle' },
  ];
};

/** 面积：上沿折线 + baseline 回边闭合的可填充 Path（坐标系无关）；单系列或多系列（series 拆多面、各取系列色） */
const lowerArea = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf?: ColorOf): IRChild | null => {
  if (mark.type !== 'area') return null;
  const baseline = mark.baseline ?? AREA_BASELINE;
  if (mark.series) {
    const seriesField = mark.series;
    const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
    const paths: Array<IRChild> = [];
    for (const series of seriesValues) {
      const seriesRows = rows.filter(row => resolveFieldPath(row, seriesField) === series);
      const steps = buildAreaSteps(mark, seriesRows, frame, baseline);
      if (!steps) continue;
      const fill = colorOf?.(seriesRows[0]) ?? DEFAULT_FILL;
      paths.push({ type: 'path', fill, children: steps });
    }
    return paths.length === 0 ? null : { type: 'scope', children: paths };
  }
  const steps = buildAreaSteps(mark, rows, frame, baseline);
  if (!steps) return null;
  const colorValue = mark.encoding.color?.value;
  const fill = colorValue !== undefined ? String(colorValue) : DEFAULT_FILL;
  return { type: 'scope', pathDefault: { fill }, children: [{ type: 'path', children: steps }] };
};

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   一个 mark 会展成 N 个图元（N = 数据点数），任何能提到图层的东西——样式、默认值、共享上下文——都别逐元素重复写。
 *   color 编码时按颜色分子 Scope；series 把记录拆成多系列（多线 / 分组 / 堆叠柱）。无可绘制图元返回 null。
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf?: ColorOf): IRChild | null => {
  // point / line / area 坐标系无关，经 frame.project（polar 连续角轴段内采样）投影
  if (mark.type === 'point') return lowerPoint(mark, rows, frame, colorOf);
  if (mark.type === 'line') return lowerLine(mark, rows, frame, colorOf);
  if (mark.type === 'area') return lowerArea(mark, rows, frame, colorOf);
  // polar：interval → sector（径向柱/玫瑰）、sector mark（饼图/环图）
  if (frame.type === PlotCoordinate.Polar2D) {
    if (mark.type === 'interval') return lowerIntervalPolar(mark, rows, frame, colorOf);
    return lowerSector(mark, rows, frame, colorOf);
  }
  // sector mark 仅 polar；cartesian 下无意义
  if (mark.type === 'sector') {
    throw new Error('lowerPlots: sector mark is only valid under the polar2D coordinate system');
  }
  // interval 笛卡尔几何
  return lowerInterval(mark, rows, frame, colorOf);
};
