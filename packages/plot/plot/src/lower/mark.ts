import { type IRChild, type IRNode, type IRNodeDefault, type IRScope, type IRStep } from '@retikz/core';
import { type ExternalRow, type IntervalMark, type Mark, PlotCoordinate } from '../ir';
import { type Wedge, buildIntervalContext, datumAnchor, intervalRect, intervalWedge, sectorWedge } from './anchor';
import { channelValue, compareByPath, isFiniteNumber, resolveFieldPath } from './field';
import { type CartesianFrame, type CoordinateFrame, type PolarFrame, type PolarVertex, densifyPolarSegments, toPolarVertex } from './project';
import {
  type DatumIdRegistrar,
  type ProvenanceContext,
  datumMeta,
  markLayerId,
  markLayerMeta,
  readSourceIndex,
  seriesPathMeta,
  slug,
} from './provenance';
import { type OpacityOf, type ShapeOf, type SizeOf } from './channel';
import { inferCategoryDomain } from './scale';

/**
 * 一个 mark 下沉时消费的通道解析器集合
 * @description color 适用所有 mark；size / opacity / shape 仅 PointMark（per-datum node 属性）。
 *   由 expand 据各通道 resolver 构造、整包传入，避免逐个位置参数（易错序）。
 */
export type MarkChannels = { colorOf?: ColorOf; sizeOf?: SizeOf; opacityOf?: OpacityOf; shapeOf?: ShapeOf };

/** 散点 glyph 默认直径（user units，已补偿 circle 外接） */
const POINT_SIZE = 10;
/** 折线默认描边宽度（user units） */
const LINE_STROKE_WIDTH = 2;
/** 无 color 编码时的回退填充 */
const DEFAULT_FILL = 'currentColor';

/** 行 → 颜色串（color 编码解析结果；undefined = 回退默认色）。由 expand 据 encoding.color 构造 */
export type ColorOf = (row: ExternalRow) => string | undefined;

/**
 * 单个 mark 下沉时的 provenance 上下文（provenance 开时由 expand 注入；关 → undefined）
 * @description 承载 plot 级开关 / plotId + 本 mark 在 marks 数组的序号，供层级 id / 来源 meta 合成。
 */
export type MarkProvenance = {
  /** plot 级 provenance 上下文（plotId / dataReference / datum 开关） */
  context: ProvenanceContext;
  /** 本 mark 在 spec.marks 的序号（写进 layer / datum meta 的 markIndex） */
  markIndex: number;
  /** plot 级 datum id 登记器（datumIdField + plotId 在时由 expand 建一份、线穿全 mark；否则 undefined） */
  registerDatumId?: DatumIdRegistrar;
};

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
  mark.type === 'sector' ? [undefined, undefined] : [channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)];

/** 柱 node 样式（rectangle + padding0 + 无描边，使 minimumWidth/Height 即真实柱尺寸） */
const barStyle = (fill: string): IRNodeDefault => ({ shape: 'rectangle', padding: 0, strokeWidth: 0, fill });

/**
 * datum node 装饰器：provenance 开时给 node 挂 per-datum meta（datumProvenance）+ datum id（datumIdField）
 * @description 关 provenance / 无 markProvenance → 原样返回（保默认逐字节等价）。透传 transformedIndex（迭代序）、
 *   读 SOURCE_INDEX 标记得 sourceIndex（best-effort）；datum id 写入与冲突检测交给 plot 级 registerDatumId（跨 mark 共享 seen）。
 */
const decorateDatum = (
  node: IRNode,
  row: ExternalRow,
  transformedIndex: number,
  markType: string,
  markProvenance: MarkProvenance | undefined,
  seriesValue: unknown,
): IRNode => {
  if (!markProvenance) return node;
  const { context, markIndex, registerDatumId } = markProvenance;
  const decorated: IRNode = { ...node };
  if (context.datumProvenance) {
    decorated.meta = datumMeta(context, markType, markIndex, transformedIndex, readSourceIndex(row), seriesValue);
  }
  const datumId = registerDatumId?.(row);
  if (datumId !== undefined) decorated.id = datumId;
  return decorated;
};

/**
 * 给图层外层 Scope 挂 layer id + meta（provenance 开时）；关 → 原样返回
 * @description point / interval / sector 的可见 datum 层：id 走 `<plotId>.<markId|mark.idx>`、meta 走 layer:mark。
 */
const attachMarkLayer = (layer: IRScope, mark: Mark, markProvenance: MarkProvenance | undefined): IRScope => {
  if (!markProvenance) return layer;
  const { context, markIndex } = markProvenance;
  const id = markLayerId(context.plotId, mark.id, markIndex);
  return {
    ...layer,
    ...(id !== undefined ? { id } : {}),
    meta: markLayerMeta(mark.type, markIndex),
  };
};

/** 散点：每行一个 circle Node（坐标系无关，经 frame.project 投影） */
const lowerPoint = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  const { colorOf, sizeOf, opacityOf, shapeOf } = channels;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    // 锚点与 locator 共享同一 datumAnchor（point → frame.project），杜绝两套投影漂移
    const point = datumAnchor(mark, row, frame);
    if (!point) continue;
    // size / opacity / shape 通道：per-datum 落到 node 自身（覆盖子 Scope nodeDefault 的默认值）。
    //   size：半径（px）→ core circle 的 minimumSize（×√2 补 circle 外接，与 pointStyle 同换算；√2 是 core 换算细节、不外泄 IR 用户）。
    //   opacity：直接写 core node 整节点不透明度。shape：直接写 core node shape 名（覆盖默认 circle）。
    const base: IRNode = { type: 'node', position: point };
    const radius = sizeOf?.(row);
    if (radius !== undefined) base.minimumSize = radius * Math.SQRT2;
    const opacity = opacityOf?.(row);
    if (opacity !== undefined) base.opacity = opacity;
    const shape = shapeOf?.(row);
    if (shape !== undefined) base.shape = shape;
    const node = decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined);
    placed.push({ color: colorOf?.(row), node });
  }
  if (placed.length === 0) return null;
  // 无 color：单图层，样式上提到 nodeDefault（守 alpha.1 结构）；有 color：每色一子 Scope
  const layer: IRScope = !colorOf
    ? { type: 'scope', nodeDefault: pointStyle(DEFAULT_FILL), children: placed.map(p => p.node) }
    : colorGroupedScope(placed, pointStyle);
  return attachMarkLayer(layer, mark, markProvenance);
};

/** 把一组「已就位 node + 其颜色」收成图层（有 color 分子 Scope、无则单层 nodeDefault） */
const barLayer = (placed: Array<{ color: string | undefined; node: IRNode }>, colorOf?: ColorOf): IRScope =>
  colorOf ? colorGroupedScope(placed, barStyle) : { type: 'scope', nodeDefault: barStyle(DEFAULT_FILL), children: placed.map(p => p.node) };

/**
 * 笛卡尔区间柱：plain / dodge / stack 统一一条摆放路径（intervalRect 单一真源；locator 同源 datumAnchor）
 * @description ctx 一次性建（buildIntervalContext），逐行调 intervalRect 取 position + width + height。
 *   stacked 缺 y0/y1 在此显式 fail loud（保留旧行为）——intervalRect 对缺字段返回 null，故必须在调用前校验。
 *   series 值（dodge / stack 都可带）写进 datum meta 的 series。
 */
const lowerInterval = (mark: IntervalMark, rows: Array<ExternalRow>, frame: CartesianFrame, colorOf: ColorOf | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  const ctx = buildIntervalContext(mark, frame, rows);
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    // 堆叠柱缺 y0/y1 fail loud（intervalRect 对缺字段静默 null，故在此显式校验保留旧行为）
    if (ctx.stacked) {
      const y0Field = mark.y0Field ?? 'y0';
      const y1Field = mark.y1Field ?? 'y1';
      const v0 = resolveFieldPath(row, y0Field);
      const v1 = resolveFieldPath(row, y1Field);
      if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
        throw new Error(`lowerPlots: stacked interval requires numeric ${y0Field} / ${y1Field} fields (run the stack transform first)`);
      }
    }
    const rect = intervalRect(mark, row, frame, ctx);
    if (!rect) continue;
    const base: IRNode = { type: 'node', position: rect.position, minimumWidth: rect.width, minimumHeight: rect.height };
    const seriesValue = mark.series ? resolveFieldPath(row, mark.series) : undefined;
    const node = decorateDatum(base, row, transformedIndex, mark.type, markProvenance, seriesValue);
    placed.push({ color: colorOf?.(row), node });
  }
  return placed.length === 0 ? null : barLayer(placed, colorOf);
};

/** sector node 样式（sector shape 自带几何，padding0 + 无描边，纯填充环楔） */
const sectorStyle = (fill: string): IRNodeDefault => ({ padding: 0, strokeWidth: 0, fill });

/** 用环楔几何建 sector Node（半径 swap 保 outerRadius>innerRadius；position = 圆心） */
const sectorNode = (wedge: Wedge): IRNode => ({
  type: 'node',
  position: wedge.center,
  shape: {
    type: 'sector',
    params: {
      innerRadius: Math.min(wedge.innerRadius, wedge.outerRadius),
      outerRadius: Math.max(wedge.innerRadius, wedge.outerRadius),
      startAngle: wedge.startAngle,
      endAngle: wedge.endAngle,
    },
  },
});

/** 把一组「已就位 sector node + 其颜色」收成图层（有 color 分子 Scope、无则单层 nodeDefault） */
const sectorLayer = (placed: Array<{ color: string | undefined; node: IRNode }>, colorOf?: ColorOf): IRScope =>
  colorOf ? colorGroupedScope(placed, sectorStyle) : { type: 'scope', nodeDefault: sectorStyle(DEFAULT_FILL), children: placed.map(p => p.node) };

/**
 * interval 在 polar 下 → sector（径向柱 / 玫瑰）；intervalWedge 单一真源（locator 同源 datumAnchor）
 * @description ctx 一次性建，逐行调 intervalWedge 取环楔几何，再 sectorNode 建 Node。
 *   stacked 缺 y0/y1 在此显式 fail loud（intervalWedge 对缺字段返回 null，故调用前校验保留旧行为）。
 */
const lowerIntervalPolar = (mark: IntervalMark, rows: Array<ExternalRow>, frame: PolarFrame, colorOf: ColorOf | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  const ctx = buildIntervalContext(mark, frame, rows);
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    if (ctx.stacked) {
      const y0Field = mark.y0Field ?? 'y0';
      const y1Field = mark.y1Field ?? 'y1';
      const v0 = resolveFieldPath(row, y0Field);
      const v1 = resolveFieldPath(row, y1Field);
      if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
        throw new Error(`lowerPlots: stacked interval requires numeric ${y0Field} / ${y1Field} fields (run the stack transform first)`);
      }
    }
    const wedge = intervalWedge(mark, row, frame, ctx);
    if (!wedge) continue;
    const seriesValue = ctx.seriesField ? resolveFieldPath(row, ctx.seriesField) : undefined;
    const node = decorateDatum(sectorNode(wedge), row, transformedIndex, mark.type, markProvenance, seriesValue);
    placed.push({ color: colorOf?.(row), node });
  }
  return placed.length === 0 ? null : sectorLayer(placed, colorOf);
};

/**
 * sector mark（饼图 / 环图）：读 transform 派生的累积角界，半径常量满铺（sectorWedge 单一真源）
 * @description 缺累积界字段（未跑 stack transform）或累积界倒退（段值为负）→ 抛清晰错误（fail loud，与堆叠 interval 同）。
 *   sectorWedge 对缺字段 / 倒退返回 null，故在此显式校验保留旧行为。
 */
const lowerSector = (mark: Mark, rows: Array<ExternalRow>, frame: PolarFrame, colorOf: ColorOf | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  if (mark.type !== 'sector') return null;
  const startField = mark.startField ?? 'y0';
  const endField = mark.endField ?? 'y1';
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const v0 = resolveFieldPath(row, startField);
    const v1 = resolveFieldPath(row, endField);
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
      throw new Error(`lowerPlots: sector mark requires numeric ${startField} / ${endField} cumulative bounds (run the stack transform first)`);
    }
    // 累积界倒退（段值为负）→ 角度跨 0、扇片比例失真且数据被静默歪曲；饼/环扇片不能为负，fail loud
    if (v1 < v0) {
      throw new Error(`lowerPlots: sector mark requires non-negative values (cumulative bound ${endField}=${v1} < ${startField}=${v0}); pie / donut slices cannot be negative`);
    }
    const wedge = sectorWedge(mark, row, frame);
    if (!wedge) continue;
    const node = decorateDatum(sectorNode(wedge), row, transformedIndex, mark.type, markProvenance, undefined);
    placed.push({ color: colorOf?.(row), node });
  }
  return placed.length === 0 ? null : sectorLayer(placed, colorOf);
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

/** 多系列 series 拆分通用：每条 series 一条 Path，provenance 开时绑 `<plotId>.series.<slug>` + Path.meta（series 原值） */
type SeriesPathBuilder = (seriesRows: Array<ExternalRow>) => Array<IRStep> | null;

const buildSeriesPaths = (
  mark: Mark,
  rows: Array<ExternalRow>,
  seriesField: string,
  buildSteps: SeriesPathBuilder,
  paintOf: (seriesRows: Array<ExternalRow>) => Record<string, string>,
  markProvenance: MarkProvenance | undefined,
): Array<IRChild> => {
  const seriesValues = inferCategoryDomain(rows.map(row => resolveFieldPath(row, seriesField)));
  const plotId = markProvenance?.context.plotId;
  const seenIds = markProvenance && plotId !== undefined ? new Map<string, unknown>() : undefined;
  const paths: Array<IRChild> = [];
  for (const series of seriesValues) {
    const seriesRows = rows.filter(row => resolveFieldPath(row, seriesField) === series);
    const steps = buildSteps(seriesRows);
    if (!steps) continue;
    const path: IRPathChild = { type: 'path', ...paintOf(seriesRows), children: steps };
    if (markProvenance) {
      if (plotId !== undefined && seenIds) {
        const id = `${plotId}.series.${slug(series)}`;
        const prior = seenIds.get(id);
        if (prior !== undefined && prior !== series) {
          throw new Error(`lowerPlots: series values "${String(prior)}" and "${String(series)}" collide to the same series id "${id}"; series anchors must be unique`);
        }
        seenIds.set(id, series);
        path.id = id;
      }
      path.meta = seriesPathMeta(mark.type, markProvenance.markIndex, series);
    }
    paths.push(path);
  }
  return paths;
};

/** path child 的可变形态（series 下沉时按需补 id / meta） */
type IRPathChild = { type: 'path'; id?: string; meta?: ReturnType<typeof seriesPathMeta>; children: Array<IRStep>; stroke?: string; fill?: string };

/**
 * 显式 series + color 字段并存时，校验 color 在每个 series 组内恒定（B/C：否则 fail-loud）
 * @description path mark 一条 series = 一条 path 一种颜色；同 series 内 color 字段多值无法表达 → 报错，
 *   提示按 color 拆系列或保持 color 在 series 内恒定。color 字段 = series 字段时天然恒定，调用方已先排除。
 */
const assertColorConstantWithinSeries = (rows: Array<ExternalRow>, seriesField: string, colorField: string): void => {
  const colorsBySeries = new Map<unknown, Set<unknown>>();
  for (const row of rows) {
    const seriesValue = resolveFieldPath(row, seriesField);
    const colorValue = resolveFieldPath(row, colorField);
    const set = colorsBySeries.get(seriesValue) ?? new Set<unknown>();
    set.add(colorValue);
    colorsBySeries.set(seriesValue, set);
  }
  for (const [seriesValue, colors] of colorsBySeries) {
    if (colors.size > 1) {
      throw new Error(
        `lowerPlots: color field "${colorField}" is not constant within series "${String(seriesValue)}"; color must be constant per series, or split by color instead of setting series`,
      );
    }
  }
};

/**
 * path mark（line / area）的有效 series 字段（B/C 规则）
 * @description 显式 mark.series 优先；无显式 series 但有 categorical color 字段 → 隐式按 color 拆系列
 *   （continuous / temporal color 已在 makeColorResolver fail-loud，故到此处的 color 字段必为分类）。
 *   显式 series 与 color 字段并存且 color 在 series 内不恒定 → fail-loud。
 */
const pathSeriesField = (mark: Mark, rows: Array<ExternalRow>): string | undefined => {
  if (mark.type !== 'line' && mark.type !== 'area') return undefined;
  const colorField = mark.encoding.color?.field;
  if (mark.series) {
    if (colorField && colorField !== mark.series) assertColorConstantWithinSeries(rows, mark.series, colorField);
    return mark.series;
  }
  return colorField;
};

/** 折线：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（坐标系无关） */
const lowerLine = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== 'line') return null;
  const closed = mark.closed ?? false;
  // B/C：显式 series 优先；无 series 但有 categorical color 字段 → 隐式按 color 拆系列（产物等价显式 series）
  const seriesField = pathSeriesField(mark, rows);
  if (seriesField) {
    const paths = buildSeriesPaths(
      mark,
      rows,
      seriesField,
      seriesRows => buildLineSteps(mark, seriesRows, frame, closed),
      seriesRows => ({ stroke: colorOf?.(seriesRows[0]) ?? DEFAULT_FILL }),
      markProvenance,
    );
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
const lowerArea = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== 'area') return null;
  const baseline = mark.baseline ?? AREA_BASELINE;
  // B/C：显式 series 优先；无 series 但有 categorical color 字段 → 隐式按 color 拆系列（产物等价显式 series）
  const seriesField = pathSeriesField(mark, rows);
  if (seriesField) {
    const paths = buildSeriesPaths(
      mark,
      rows,
      seriesField,
      seriesRows => buildAreaSteps(mark, seriesRows, frame, baseline),
      seriesRows => ({ fill: colorOf?.(seriesRows[0]) ?? DEFAULT_FILL }),
      markProvenance,
    );
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
 *   markProvenance 给定（provenance 开）→ 给图层 / series Path / datum Node 绑 id + 来源 meta；否则产物逐字节等价 alpha.4。
 *   datum id 走 markProvenance.registerDatumId（plot 级共享 seen、跨 mark 查重）。
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels = {}, markProvenance?: MarkProvenance): IRChild | null => {
  const { colorOf } = channels;
  // point / line / area 坐标系无关，经 frame.project（polar 连续角轴段内采样）投影
  if (mark.type === 'point') return lowerPoint(mark, rows, frame, channels, markProvenance);
  if (mark.type === 'line') {
    const layer = lowerLine(mark, rows, frame, colorOf, markProvenance);
    return layer === null ? null : attachMarkLayer(layer as IRScope, mark, markProvenance);
  }
  if (mark.type === 'area') {
    const layer = lowerArea(mark, rows, frame, colorOf, markProvenance);
    return layer === null ? null : attachMarkLayer(layer as IRScope, mark, markProvenance);
  }
  // polar：interval → sector（径向柱/玫瑰）、sector mark（饼图/环图）
  if (frame.type === PlotCoordinate.Polar2D) {
    const layer = mark.type === 'interval' ? lowerIntervalPolar(mark, rows, frame, colorOf, markProvenance) : lowerSector(mark, rows, frame, colorOf, markProvenance);
    return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
  }
  // sector mark 仅 polar；cartesian 下无意义
  if (mark.type === 'sector') {
    throw new Error('lowerPlots: sector mark is only valid under the polar2D coordinate system');
  }
  // interval 笛卡尔几何
  const layer = lowerInterval(mark, rows, frame, colorOf, markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};
