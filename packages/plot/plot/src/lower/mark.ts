import { type IRChild, type IRNode, type IRNodeDefault, type IRNodeLabel, type IRScope, type IRStep } from '@retikz/core';
import { type ExternalRow, type IntervalMark, type Mark, PlotCoordinate, PlotMark, type RibbonMark, type RuleMark, type TextMark } from '../ir';
import { type IntervalContext, RIBBON_DEFAULT_CURVATURE, buildIntervalContext, datumAnchor, markCell, ribbonBandGeometry, ribbonEndpoints, roleValues } from './anchor';
import { channelValue, compareByPath, isFiniteNumber, resolveFieldPath } from './field';
import { type CartesianFrame, type Cell, type CellGeometry, type CoordinateFrame, type PolarFrame, type PolarVertex, densifyPolarSegments, toPolarVertex } from './project';
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
export type MarkChannels = { colorOf?: ColorOf; defaultColor?: string; sizeOf?: SizeOf; opacityOf?: OpacityOf; shapeOf?: ShapeOf; labelOf?: LabelOf };

/** 行 → 标签串（text 内容通道 + 可选 format + 运行时 resolveLabel 解析结果；undefined = 该行无内容、跳过 / 不挂 label）。由 expand 据 content/fieldTypes/resolveLabel 构造 */
export type LabelOf = (row: ExternalRow) => string | undefined;

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
  mark.type === PlotMark.Sector || mark.type === PlotMark.Ribbon ? [undefined, undefined] : [channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)];

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
 * priority-1 宿主 label：若位置 mark 带 `label` 且该行解析出内容，给 datum Node 填 core NodeLabelSchema
 * @description 零新建 Node：position / distance / pin 直接落 core label（边框相对定位 + 引线由 core 负责）。
 *   labelOf(row) 解析（resolveLabel > field+format > value）出 undefined 时该行不挂 label（内容缺失跳过语义）。
 */
const attachDatumLabel = (node: IRNode, mark: Mark, row: ExternalRow, labelOf: LabelOf | undefined): IRNode => {
  if (labelOf === undefined || !('label' in mark) || mark.label === undefined) return node;
  const text = labelOf(row);
  if (text === undefined) return node;
  const label: IRNodeLabel = {
    text,
    ...(mark.label.position !== undefined ? { position: mark.label.position } : {}),
    ...(mark.label.distance !== undefined ? { distance: mark.label.distance } : {}),
    ...(mark.label.pin ? { pin: true } : {}),
  };
  return { ...node, label };
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
  const { colorOf, defaultColor = DEFAULT_FILL, sizeOf, opacityOf, shapeOf, labelOf } = channels;
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
    const node = attachDatumLabel(decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined), mark, row, labelOf);
    placed.push({ color: colorOf?.(row), node });
  }
  if (placed.length === 0) return null;
  // 无 color：单图层，样式上提到 nodeDefault（守 alpha.1 结构）；有 color：每色一子 Scope
  const layer: IRScope = !colorOf
    ? { type: 'scope', nodeDefault: pointStyle(defaultColor), children: placed.map(p => p.node) }
    : colorGroupedScope(placed, pointStyle);
  return attachMarkLayer(layer, mark, markProvenance);
};

/** sector / contour node 样式（shape 自带几何，padding0 + 无描边，纯填充） */
const shapeStyle = (fill: string): IRNodeDefault => ({ padding: 0, strokeWidth: 0, fill });

/** 某 geometry kind 对应的 node 样式工厂（rect → 矩形 barStyle；sector / contour → shapeStyle） */
const styleForGeometry = (kind: CellGeometry['kind']): ((fill: string) => IRNodeDefault) => (kind === 'rect' ? barStyle : shapeStyle);

/** 把一组「已就位 node + 其颜色」收成图层（有 color 分子 Scope、无则单层 nodeDefault；样式按 geometry kind 选） */
const cellLayer = (
  placed: Array<{ color: string | undefined; node: IRNode }>,
  kind: CellGeometry['kind'],
  colorOf: ColorOf | undefined,
  defaultColor = DEFAULT_FILL,
): IRScope => {
  const styleFor = styleForGeometry(kind);
  return colorOf ? colorGroupedScope(placed, styleFor) : { type: 'scope', nodeDefault: styleFor(defaultColor), children: placed.map(p => p.node) };
};

/** 点集 AABB 中心（contour Node.position = 顶点环 AABB 中心，与 core contour shape 自动居中同源） */
const aabbCenterOf = (points: Array<[number, number]>): [number, number] => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

/**
 * CellGeometry → core Node（统一装配，替换旧三分支）
 * @description rect → Node{position, minimumWidth, minimumHeight}（与旧 lowerInterval 逐字段等价）；
 *   sector → Node{position:center, shape:sector}（半径 swap 保 outer>inner，与旧 sectorNode 逐字段等价）；
 *   contour → Node{position: 顶点 AABB 中心, shape:contour{points}}（core 据 points AABB 自动居中，position 对齐几何中心）。
 */
const cellGeometryNode = (geometry: CellGeometry): IRNode => {
  if (geometry.kind === 'rect') {
    return { type: 'node', position: geometry.position, minimumWidth: geometry.width, minimumHeight: geometry.height };
  }
  if (geometry.kind === 'sector') {
    return {
      type: 'node',
      position: geometry.center,
      shape: {
        type: 'sector',
        params: {
          innerRadius: Math.min(geometry.innerRadius, geometry.outerRadius),
          outerRadius: Math.max(geometry.innerRadius, geometry.outerRadius),
          startAngle: geometry.startAngle,
          endAngle: geometry.endAngle,
        },
      },
    };
  }
  return {
    type: 'node',
    position: aabbCenterOf(geometry.points),
    shape: { type: 'contour', params: { points: geometry.points } },
  };
};

/** 堆叠 interval 缺 y0/y1 fail-loud（cell 对缺字段静默 null，故在装配前显式校验保留旧行为） */
const assertStackedFields = (mark: IntervalMark, row: ExternalRow): void => {
  const y0Field = mark.y0Field ?? 'y0';
  const y1Field = mark.y1Field ?? 'y1';
  const v0 = resolveFieldPath(row, y0Field);
  const v1 = resolveFieldPath(row, y1Field);
  if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
    throw new Error(`lowerPlots: stacked interval requires numeric ${y0Field} / ${y1Field} fields (run the stack transform first)`);
  }
};

/** sector mark 缺累积界 / 倒退 fail-loud（cell 对缺字段 / 倒退静默 null，故在装配前显式校验保留旧行为） */
const assertSectorFields = (mark: Mark, row: ExternalRow): void => {
  if (mark.type !== PlotMark.Sector) return;
  const startField = mark.startField ?? 'y0';
  const endField = mark.endField ?? 'y1';
  const v0 = resolveFieldPath(row, startField);
  const v1 = resolveFieldPath(row, endField);
  if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) {
    throw new Error(`lowerPlots: sector mark requires numeric ${startField} / ${endField} cumulative bounds (run the stack transform first)`);
  }
  // 累积界倒退（段值为负）→ 角度跨 0、扇片比例失真且数据被静默歪曲；饼/环扇片不能为负，fail loud
  if (v1 < v0) {
    throw new Error(`lowerPlots: sector mark requires non-negative values (cumulative bound ${endField}=${v1} < ${startField}=${v0}); pie / donut slices cannot be negative`);
  }
};

/**
 * rect mark 的双 band 校验：cartesian2D 下 x / y 都必须是 band scale（取 bandwidth 当格宽/高）
 * @description secondary（y）非 band（bandwidth ≤ 0，连续 linear / time）→ fail-loud，明确指明 y 须 band；
 *   primary（x）非 band 同样无网格语义，一并校验。无 band → 格塌成零尺寸、heatmap 无意义，不静默出怪图。
 */
const assertRectBands = (frame: CartesianFrame): void => {
  if (!(frame.primary.bandwidth > 0)) {
    throw new Error('lowerPlots: rect mark requires a band x scale (x must be categorical to size the heatmap cell width); use a band scale on x');
  }
  if (!(frame.secondary.bandwidth > 0)) {
    throw new Error('lowerPlots: rect mark requires a band y scale (y must be categorical to size the heatmap cell height); use a band scale on y');
  }
};

/**
 * cell 类 mark 某行的 series 值（写进 datum meta；保旧逐字段行为）
 * @description sector mark 无 series → undefined；cartesian interval 取 mark.series（stacked 也带）；polar interval
 *   取 ctx.seriesField（stacked 下为 undefined，与旧 lowerIntervalPolar 一致）。两者非堆叠时等值（buildIntervalContext
 *   非堆叠时 ctx.seriesField = mark.series），仅堆叠分叉——按 frame.type 取以维持 byte-equality。
 */
const cellSeriesValue = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx: IntervalContext | undefined): unknown => {
  if (mark.type !== PlotMark.Interval) return undefined;
  const field = frame.type === PlotCoordinate.Cartesian2D ? mark.series : ctx?.seriesField;
  return field ? resolveFieldPath(row, field) : undefined;
};

/**
 * cell 类 mark（interval / sector）单路径下沉：算 cell → frame.projectCell → CellGeometry → 装配 Node
 * @description 收敛旧 lowerInterval / lowerIntervalPolar / lowerSector 三分支——判断挪进坐标系（frame.projectCell
 *   产 rect / sector / contour），mark 侧零分叉。stacked / sector 缺字段在装配前 fail-loud（保留旧行为）；装配样式
 *   按 geometry kind 选（rect → 矩形 barStyle、sector / contour → shapeStyle）。无可绘制图元返回 null。
 *   frame.projectCell 由调用方 lowerMark 保证存在；同一 mark 全行 geometry kind 一致（取末个就位行 kind）。
 */
const lowerCells = (
  mark: Mark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  projectCell: (cell: Cell) => CellGeometry,
  ctx: IntervalContext | undefined,
  colorOf: ColorOf | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
  labelOf: LabelOf | undefined,
): IRScope | null => {
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  let kind: CellGeometry['kind'] | undefined;
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    if (mark.type === PlotMark.Sector) assertSectorFields(mark, row);
    else if (ctx?.stacked && mark.type === PlotMark.Interval) assertStackedFields(mark, row);
    const cell = markCell(mark, row, frame, ctx);
    if (!cell) continue;
    const geometry = projectCell(cell);
    kind = geometry.kind;
    const node = attachDatumLabel(
      decorateDatum(cellGeometryNode(geometry), row, transformedIndex, mark.type, markProvenance, cellSeriesValue(mark, row, frame, ctx)),
      mark,
      row,
      labelOf,
    );
    placed.push({ color: colorOf?.(row), node });
  }
  return placed.length === 0 || kind === undefined ? null : cellLayer(placed, kind, colorOf, defaultColor);
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
  pointsToSteps(buildOutlinePoints(mark, orderRows(rows, mark.type === PlotMark.Line || mark.type === PlotMark.Area ? mark.order : undefined), frame, closed), closed);

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
  if (mark.type !== PlotMark.Line && mark.type !== PlotMark.Area) return undefined;
  const colorField = mark.encoding.color?.field;
  if (mark.series) {
    if (colorField && colorField !== mark.series) assertColorConstantWithinSeries(rows, mark.series, colorField);
    return mark.series;
  }
  return colorField;
};

/** 折线：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（坐标系无关） */
const lowerLine = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, defaultColor: string | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  if (mark.type !== PlotMark.Line) return null;
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
  const stroke = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
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
  const ordered = orderRows(rows, mark.type === PlotMark.Area ? mark.order : undefined);
  const closed = mark.type === PlotMark.Area ? (mark.closed ?? false) : false;
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
const lowerArea = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, defaultColor: string | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  if (mark.type !== PlotMark.Area) return null;
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
  const fill = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
  return { type: 'scope', pathDefault: { fill }, children: [{ type: 'path', children: steps }] };
};

/** ribbon 最大带宽（user units）：合成 width 线性 scale 的 range 上界（value 域 max → 此宽） */
const RIBBON_MAX_WIDTH = 40;

/**
 * 合成 ribbon 的 value → 半宽（user units）映射：线性 [0, maxValue] → [0, RIBBON_MAX_WIDTH/2]
 * @description 默认合成线性 scale（ADR-05 width 缺省）；域上界取所有行 value / endWidth 的有限最大绝对值。
 *   全零 / 无有限值 → 上界 0（所有带零宽跳过）。返回 value → 半宽（半宽 = 全宽 / 2，供四角法向偏移）。
 */
const ribbonHalfWidthOf = (mark: RibbonMark, rows: Array<ExternalRow>): ((value: number) => number) => {
  let maxValue = 0;
  const consider = (raw: unknown): void => {
    if (isFiniteNumber(raw) && Math.abs(raw) > maxValue) maxValue = Math.abs(raw);
  };
  for (const row of rows) {
    consider(resolveFieldPath(row, mark.value));
    if (mark.endWidth !== undefined) consider(resolveFieldPath(row, mark.endWidth));
  }
  const halfMax = RIBBON_MAX_WIDTH / 2;
  return value => (maxValue > 0 ? (value / maxValue) * halfMax : 0);
};

/** ribbon 一行的 value（流量）：非有限 / 缺失 → null（跳过该行）；负值 → fail-loud（负流不静默歪曲） */
const ribbonValueOf = (row: ExternalRow, field: string): number | null => {
  const raw = resolveFieldPath(row, field);
  if (!isFiniteNumber(raw)) return null;
  if (raw < 0) {
    throw new Error(`lowerPlots: ribbon mark requires non-negative ${field} (got ${raw}); negative flow cannot be drawn as a band width`);
  }
  return raw;
};

/**
 * 流带（ribbon mark）下沉：每行 → 一条可填充 cubic 曲带 Path（坐标系无关端点投影 + 屏幕空间几何）
 * @description 端点为字段对，经 frame.projectRoles 投影成屏幕中心点；value → 源端半宽、endWidth（缺省 = value）→
 *   目标端半宽（合成线性 width scale）；ribbonBandGeometry 算四角 + 上 / 下边界 cubic 控制点（弦法向 + curvature 主轴外推）。
 *   steps：move(S_top) → cubic(T_top) → line(T_bot)[目标封口] → cubic(S_bot) → cycle[源封口闭合]。
 *   零宽（半宽 < ε）/ 端点非有限 / 源目标重合 → 跳过该行；value 负 → fail-loud。color 字段按色分子 Scope 上提 fill。
 *   width 具名 scale（mark.width）v1 不支持（见 ADR-05 不在范围）→ fail-loud；缺省合成线性 scale。
 */
const lowerRibbon = (mark: RibbonMark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, defaultColor: string | undefined): IRScope | null => {
  if (mark.width !== undefined) {
    throw new Error(`lowerPlots: ribbon mark named width scale "${mark.width}" is not supported this round; omit width for a synthesized linear scale`);
  }
  const halfWidthOf = ribbonHalfWidthOf(mark, rows);
  const curvature = mark.curvature ?? RIBBON_DEFAULT_CURVATURE;
  const placed: Array<{ color: string | undefined; steps: Array<IRStep> }> = [];
  for (const row of rows) {
    const value = ribbonValueOf(row, mark.value);
    if (value === null) continue;
    const endValue = mark.endWidth !== undefined ? ribbonValueOf(row, mark.endWidth) : value;
    if (endValue === null) continue;
    const halfSource = halfWidthOf(value);
    const halfTarget = halfWidthOf(endValue);
    // 零宽（源端半宽 < ε）跳过：退化带无可填充区域（与 area 上沿 < 2 点、interval 零高一致）
    if (!(halfSource > 1e-9)) continue;
    const endpoints = ribbonEndpoints(mark, row, frame);
    if (endpoints === null) continue;
    const geometry = ribbonBandGeometry(endpoints.source, endpoints.target, halfSource, halfTarget, curvature);
    if (geometry === null) continue;
    const steps: Array<IRStep> = [
      { type: 'step', kind: 'move', to: geometry.sourceTop },
      { type: 'step', kind: 'cubic', to: geometry.targetTop, control1: geometry.topControl1, control2: geometry.topControl2 },
      { type: 'step', kind: 'line', to: geometry.targetBottom },
      { type: 'step', kind: 'cubic', to: geometry.sourceBottom, control1: geometry.bottomControl1, control2: geometry.bottomControl2 },
      { type: 'step', kind: 'cycle' },
    ];
    placed.push({ color: colorOf?.(row), steps });
  }
  if (placed.length === 0) return null;
  // 无 color field：单层 pathDefault.fill（取常量 color value 或默认）；有 color field：按色分子 Scope 上提 fill（IR 体积 O(色数)）
  if (!colorOf) {
    const colorValue = mark.encoding.color?.value;
    const fill = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
    return { type: 'scope', pathDefault: { fill }, children: placed.map(p => ({ type: 'path', children: p.steps })) };
  }
  const groups = new Map<string, Array<IRChild>>();
  for (const { color, steps } of placed) {
    const fill = color ?? DEFAULT_FILL;
    const path: IRChild = { type: 'path', children: steps };
    const bucket = groups.get(fill);
    if (bucket) bucket.push(path);
    else groups.set(fill, [path]);
  }
  const children: Array<IRChild> = [...groups].map(([fill, paths]) => ({ type: 'scope', pathDefault: { fill }, children: paths }));
  return { type: 'scope', children };
};

/** rule 描边宽度（参考线；与 line mark 同宽，视觉一致） */
const RULE_STROKE_WIDTH = LINE_STROKE_WIDTH;

/**
 * rule 取向：恰好绑 encoding.x（竖直）或 encoding.y（水平）之一；皆设 / 皆缺 → fail-loud
 * @description 取向由绑定维度决定（无独立 orientation 字段）；'x' = 竖直 rule（x=const 跨 y 域）、'y' = 水平 rule（y=const 跨 x 域）。
 */
const ruleOrientation = (mark: RuleMark): 'x' | 'y' => {
  const hasX = mark.encoding.x !== undefined;
  const hasY = mark.encoding.y !== undefined;
  if (hasX === hasY) {
    throw new Error('lowerPlots: rule mark must bind exactly one of encoding.x (vertical) or encoding.y (horizontal); set one, not both / neither');
  }
  return hasX ? 'x' : 'y';
};

/**
 * rule 的对侧维度（垂直于常量轴）输出区间：默认满铺该轴 range，extent 字段给定时截成 [extentLo, extentTo] 输出坐标
 * @description extentField / extentToField 须成对（单设 fail-loud）；皆缺 → 满铺 oppositeScale.range()。
 *   extent 值经对侧 scale.coordinate 投影成输出坐标（cartesian = 像素、polar = 角度度 / 半径 user units）。
 *   某行 extent 值非有限 → 返回 null（跳过该行）。
 */
const ruleSpanInterval = (mark: RuleMark, row: ExternalRow, oppositeCoordinate: (value: unknown) => number, oppositeRange: [number, number]): [number, number] | null => {
  const hasFrom = mark.extentField !== undefined;
  const hasTo = mark.extentToField !== undefined;
  if (hasFrom !== hasTo) {
    throw new Error('lowerPlots: rule mark extentField / extentToField must be set together (a partial-length span needs both start and end)');
  }
  if (!hasFrom) return oppositeRange;
  const lo = oppositeCoordinate(resolveFieldPath(row, mark.extentField as string));
  const hi = oppositeCoordinate(resolveFieldPath(row, mark.extentToField as string));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
};

/** rule line 某行的常量轴值（绑 x → encoding.x、绑 y → encoding.y；value 常量 / field per-datum 均经 channelValue） */
const ruleConstantValue = (mark: RuleMark, row: ExternalRow, orientation: 'x' | 'y'): unknown =>
  channelValue(orientation === 'x' ? mark.encoding.x : mark.encoding.y, row);

/** rule band 某行的上界值（绑 x → xTo、绑 y → yTo；number 常量 / string field per-datum） */
const ruleUpperValue = (mark: RuleMark, row: ExternalRow, orientation: 'x' | 'y'): unknown => {
  const bound = orientation === 'x' ? mark.xTo : mark.yTo;
  return typeof bound === 'string' ? resolveFieldPath(row, bound) : bound;
};

/** rule 是否 band 形态（绑定维度上给了匹配的上界 xTo / yTo）；并校验上界与所绑维度匹配（不匹配 / 单飞 → fail-loud） */
const isRuleBand = (mark: RuleMark, orientation: 'x' | 'y'): boolean => {
  if (orientation === 'x' && mark.yTo !== undefined) {
    throw new Error('lowerPlots: rule mark binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)');
  }
  if (orientation === 'y' && mark.xTo !== undefined) {
    throw new Error('lowerPlots: rule mark binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)');
  }
  return (orientation === 'x' ? mark.xTo : mark.yTo) !== undefined;
};

/**
 * rule 是否完全常量（单条 full-span line / band，不逐行）：常量轴是 value、band 上界是 number、无 extent field
 * @description 任一数据驱动输入（encoding.x/y 的 field、xTo/yTo 的 string field、extentField）→ per-datum 逐行；
 *   全常量 → 与数据行数无关的单条标注，仅迭代一行代表（避免 N 行同值产 N 条重复 Path / Node）。
 */
const isRuleConstant = (mark: RuleMark, orientation: 'x' | 'y'): boolean => {
  const constantChannel = orientation === 'x' ? mark.encoding.x : mark.encoding.y;
  if (constantChannel?.field !== undefined) return false;
  const upper = orientation === 'x' ? mark.xTo : mark.yTo;
  if (typeof upper === 'string') return false;
  return mark.extentField === undefined && mark.extentToField === undefined;
};

/** rule 的有效迭代行：全常量 → 单行代表（任取首行，无行则空对象）；per-datum → 原数据行 */
const ruleRows = (mark: RuleMark, rows: Array<ExternalRow>, orientation: 'x' | 'y'): Array<ExternalRow> =>
  isRuleConstant(mark, orientation) ? [rows[0] ?? {}] : rows;

/** rule line 某行 → core Path steps（cartesian 直连两端点；polar 竖直径向线直连、水平常半径环段采样）；退化 → null */
const ruleLineSteps = (mark: RuleMark, row: ExternalRow, frame: CartesianFrame | PolarFrame, orientation: 'x' | 'y'): Array<IRStep> | null => {
  const constantValue = ruleConstantValue(mark, row, orientation);
  if (frame.type === PlotCoordinate.Cartesian2D) {
    // 常量轴投影成像素；对侧维满铺 range（或 extent 截断）。绑 x → 竖直（x 常量、y 跨域）、绑 y → 水平。
    const constant = frame[orientation === 'x' ? 'primary' : 'secondary'].coordinate(constantValue);
    if (!Number.isFinite(constant)) return null;
    const opposite = orientation === 'x' ? frame.secondary : frame.primary;
    const span = ruleSpanInterval(mark, row, opposite.coordinate, opposite.range());
    if (span === null) return null;
    const start: [number, number] = orientation === 'x' ? [constant, span[0]] : [span[0], constant];
    const end: [number, number] = orientation === 'x' ? [constant, span[1]] : [span[1], constant];
    return pointsToSteps([start, end], false);
  }
  // polar：绑 x（常量角度）→ 径向线 inner→outer（或 extent 半径截断）；绑 y（常量半径）→ 角向弧 / 整圆段采样
  if (orientation === 'x') {
    const theta = frame.primary.coordinate(constantValue);
    if (!Number.isFinite(theta)) return null;
    const span = ruleSpanInterval(mark, row, frame.secondary.coordinate, [frame.innerRadius, frame.outerRadius]);
    if (span === null) return null;
    const inner = frame.projectPolar(theta, span[0]);
    const outer = frame.projectPolar(theta, span[1]);
    return inner && outer ? pointsToSteps([inner, outer], false) : null;
  }
  const radius = frame.secondary.coordinate(constantValue);
  if (!Number.isFinite(radius)) return null;
  // 角向满域 [startAngle, endAngle]（或 extent 角度截断）；常半径变角 → densifyPolarSegments 段采样弯成弧
  const angleSpan = ruleSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
  if (angleSpan === null) return null;
  const points = densifyPolarSegments(frame, [
    { theta: angleSpan[0], radius },
    { theta: angleSpan[1], radius },
  ]);
  return pointsToSteps(points, false);
};

/** rule band 某行 → 正交 Cell（cartesian primary/secondary 为像素带、polar primary 为角度带 / secondary 为半径带）；退化 → null */
const ruleBandCell = (mark: RuleMark, row: ExternalRow, frame: CartesianFrame | PolarFrame, orientation: 'x' | 'y'): Cell | null => {
  const lo = ruleConstantValue(mark, row, orientation);
  const hi = ruleUpperValue(mark, row, orientation);
  if (frame.type === PlotCoordinate.Cartesian2D) {
    const constScale = orientation === 'x' ? frame.primary : frame.secondary;
    const c0 = constScale.coordinate(lo);
    const c1 = constScale.coordinate(hi);
    if (!Number.isFinite(c0) || !Number.isFinite(c1)) return null;
    const opposite = orientation === 'x' ? frame.secondary : frame.primary;
    const span = ruleSpanInterval(mark, row, opposite.coordinate, opposite.range());
    if (span === null) return null;
    // cartesian projectCell：primary → x 像素带（宽）、secondary → y 像素带（高）。
    //   竖直 band（绑 x）：x = 常量区间、y = 对侧满铺；水平 band（绑 y）：x = 对侧满铺、y = 常量区间。
    return orientation === 'x' ? { primary: [c0, c1], secondary: span } : { primary: span, secondary: [c0, c1] };
  }
  // polar band：绑 y（半径区间）→ 角向满域 + 半径 [coord(lo),coord(hi)] → 环带 sector；绑 x（角度区间）→ 角度 [coord(lo),coord(hi)] + 半径满域 → 扇形楔
  if (orientation === 'y') {
    const r0 = frame.secondary.coordinate(lo);
    const r1 = frame.secondary.coordinate(hi);
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) return null;
    const angleSpan = ruleSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
    if (angleSpan === null) return null;
    return { primary: angleSpan, secondary: [r0, r1] };
  }
  const a0 = frame.primary.coordinate(lo);
  const a1 = frame.primary.coordinate(hi);
  if (!Number.isFinite(a0) || !Number.isFinite(a1)) return null;
  const radiusSpan = ruleSpanInterval(mark, row, frame.secondary.coordinate, [frame.innerRadius, frame.outerRadius]);
  if (radiusSpan === null) return null;
  return { primary: [a0, a1], secondary: radiusSpan };
};

/**
 * 参考标注（rule mark）下沉：line → core Path（每行一条）、band → ADR-01 projectCell Node（每行一个）
 * @description 取向由 encoding.x XOR y 决定（皆设 / 皆缺 fail-loud）；line vs band 由匹配维度的 xTo / yTo 判别。
 *   line stroke / band fill 经 color 编码：单条常量取 encoding.color.value、per-datum field 按色分子 Scope 上提（line→stroke / band→fill）。
 *   cartesian2D / polar2D 支持；其余坐标系由调用方 lowerMark fail-loud。无可绘制图元返回 null。
 */
const lowerRule = (
  mark: RuleMark,
  rows: Array<ExternalRow>,
  frame: CartesianFrame | PolarFrame,
  colorOf: ColorOf | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  const orientation = ruleOrientation(mark);
  const band = isRuleBand(mark, orientation);
  const effectiveRows = ruleRows(mark, rows, orientation);

  if (band) {
    const placed: Array<{ color: string | undefined; node: IRNode }> = [];
    let kind: CellGeometry['kind'] | undefined;
    for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
      const row = effectiveRows[transformedIndex];
      const cell = ruleBandCell(mark, row, frame, orientation);
      if (!cell) continue;
      const geometry = frame.projectCell(cell);
      kind = geometry.kind;
      const node = decorateDatum(cellGeometryNode(geometry), row, transformedIndex, mark.type, markProvenance, undefined);
      placed.push({ color: colorOf?.(row), node });
    }
    if (placed.length === 0 || kind === undefined) return null;
    // 单条常量 band 且无 color field → fill 取 encoding.color.value 或默认；否则按色分子 Scope（fill 上提）
    if (!colorOf) {
      const colorValue = mark.encoding.color?.value;
      const fill = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
      return { type: 'scope', nodeDefault: styleForGeometry(kind)(fill), children: placed.map(p => p.node) };
    }
    return cellLayer(placed, kind, colorOf, defaultColor);
  }

  // line 形态：每行一条 Path（move + line）；color field → 按色分子 Scope 上提 stroke，否则单层 pathDefault.stroke
  const placed: Array<{ color: string | undefined; steps: Array<IRStep>; row: ExternalRow; transformedIndex: number }> = [];
  for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
    const row = effectiveRows[transformedIndex];
    const steps = ruleLineSteps(mark, row, frame, orientation);
    if (!steps) continue;
    placed.push({ color: colorOf?.(row), steps, row, transformedIndex });
  }
  if (placed.length === 0) return null;
  if (!colorOf) {
    const colorValue = mark.encoding.color?.value;
    const stroke = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
    return { type: 'scope', pathDefault: { stroke, strokeWidth: RULE_STROKE_WIDTH }, children: placed.map(p => ({ type: 'path', children: p.steps })) };
  }
  // color field：每条 line 按其色分组 → 子 Scope 上提 stroke（IR 体积 O(色数)）
  const groups = new Map<string, Array<IRChild>>();
  for (const { color, steps } of placed) {
    const stroke = color ?? DEFAULT_FILL;
    const path: IRChild = { type: 'path', children: steps };
    const bucket = groups.get(stroke);
    if (bucket) bucket.push(path);
    else groups.set(stroke, [path]);
  }
  const children: Array<IRChild> = [...groups].map(([stroke, paths]) => ({ type: 'scope', pathDefault: { stroke }, children: paths }));
  return { type: 'scope', pathDefault: { strokeWidth: RULE_STROKE_WIDTH }, children };
};

/** 自由文本 node 样式（无 shape 边框：padding0 + 无描边 + textColor 上提到子 Scope；色走文本而非 fill） */
const textStyle = (textColor: string): IRNodeDefault => ({ padding: 0, strokeWidth: 0, textColor });

/**
 * priority-2 兜底：无宿主自由文本 → 每行投影成带 `text` 的 core Node（镜像 lowerPoint 装配，坐标系无关）
 * @description 位置走 datumAnchor（point 同源 frame.projectRoles，坐标系无关）；text 内容 labelOf 解析（缺失跳过）；
 *   dx/dy 仅作锚点像素级微调逃生舱（首选用 label 的 position/distance，这里无宿主故落 Node.text）。
 *   color 复用 colorGroupedScope，但文本色走子 Scope nodeDefault 的 textColor（非 fill）。
 */
const lowerText = (mark: TextMark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  const { colorOf, defaultColor = DEFAULT_FILL, labelOf } = channels;
  const dx = mark.dx ?? 0;
  const dy = mark.dy ?? 0;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const point = frame.projectRoles(roleValues(mark, row, frame));
    if (!point) continue;
    const text = labelOf?.(row);
    if (text === undefined) continue;
    const position: [number, number] = dx === 0 && dy === 0 ? point : [point[0] + dx, point[1] + dy];
    const base: IRNode = { type: 'node', position, text };
    const node = decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined);
    placed.push({ color: colorOf?.(row), node });
  }
  if (placed.length === 0) return null;
  const layer: IRScope = !colorOf
    ? { type: 'scope', nodeDefault: textStyle(defaultColor), children: placed.map(p => p.node) }
    : colorGroupedScope(placed, textStyle);
  return attachMarkLayer(layer, mark, markProvenance);
};

/**
 * 坐标系不支持某 mark 的统一 fail-loud 文案（含 mark.type / frame.type，便于定位）
 * @description line / area 在非 2D 坐标系、cell 类 mark 在无 projectCell 的坐标系（1D / ternary / 未实现的 custom）共用。
 *   custom 帧 type='custom'，文案「under the custom coordinate system」天然含「custom coordinate」。
 */
const failLoudMessage = (markType: string, frameType: string): string =>
  `lowerPlots: ${markType} mark is not supported under the ${frameType} coordinate system (this coordinate system does not provide the geometry for ${markType} marks this round)`;

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   一个 mark 会展成 N 个图元（N = 数据点数），任何能提到图层的东西——样式、默认值、共享上下文——都别逐元素重复写。
 *   color 编码时按颜色分子 Scope；series 把记录拆成多系列（多线 / 分组 / 堆叠柱）。无可绘制图元返回 null。
 *   markProvenance 给定（provenance 开）→ 给图层 / series Path / datum Node 绑 id + 来源 meta；否则产物逐字节等价 alpha.4。
 *   datum id 走 markProvenance.registerDatumId（plot 级共享 seen、跨 mark 查重）。
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels = {}, markProvenance?: MarkProvenance): IRChild | null => {
  const { colorOf, defaultColor, labelOf } = channels;
  // point 坐标系无关，经 frame.project（polar 连续角轴段内采样）投影
  if (mark.type === PlotMark.Point) return lowerPoint(mark, rows, frame, channels, markProvenance);

  // text（priority-2 兜底自由文本）坐标系无关，与 point 同源 frame.projectRoles 投影；不进 interval fail-loud 网
  if (mark.type === PlotMark.Text) return lowerText(mark, rows, frame, channels, markProvenance);

  // line / area 仅 cartesian2D / polar2D 有上沿 / 回边几何；其余坐标系（1D / ternary / custom）本轮 fail-loud
  if (mark.type === PlotMark.Line || mark.type === PlotMark.Area) {
    if (frame.type !== PlotCoordinate.Cartesian2D && frame.type !== PlotCoordinate.Polar2D) {
      throw new Error(failLoudMessage(mark.type, frame.type));
    }
    const layer = mark.type === PlotMark.Line ? lowerLine(mark, rows, frame, colorOf, defaultColor, markProvenance) : lowerArea(mark, rows, frame, colorOf, defaultColor, markProvenance);
    return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
  }

  // ribbon（流带）：每行一条可填充 cubic 曲带 Path；端点字段对经 frame.projectRoles 投影、几何按笛卡尔屏幕空间算，
  //   本轮仅 cartesian2D（非笛卡尔曲带形态如极坐标 chord 顺延，见 ADR-05 不在范围），其余坐标系 fail-loud
  if (mark.type === PlotMark.Ribbon) {
    if (frame.type !== PlotCoordinate.Cartesian2D) {
      throw new Error(failLoudMessage(mark.type, frame.type));
    }
    const layer = lowerRibbon(mark, rows, frame, colorOf, defaultColor);
    return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
  }

  // rule（参考标注）：line 走 core Path、band 走 ADR-01 projectCell；本轮仅 cartesian2D / polar2D（band 在 polar 经 projectCell），其余坐标系 fail-loud
  if (mark.type === PlotMark.Rule) {
    if (frame.type !== PlotCoordinate.Cartesian2D && frame.type !== PlotCoordinate.Polar2D) {
      throw new Error(failLoudMessage(mark.type, frame.type));
    }
    const layer = lowerRule(mark, rows, frame, colorOf, defaultColor, markProvenance);
    return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
  }

  // 此后只剩 cell 类 mark（interval / sector / rect）：判断挪进坐标系——须实现 projectCell 才支持（cartesian → rect、
  //   polar → sector、曲线 / 自定义 frame → contour）；无 projectCell（1D / ternary / 未实现的 custom）→ fail-loud。
  // sector mark 仅 polar；非 polar（含已有 projectCell 的 cartesian）下无意义，先给精确提示。
  if (mark.type === PlotMark.Sector && frame.type !== PlotCoordinate.Polar2D) {
    throw new Error('lowerPlots: sector mark is only valid under the polar2D coordinate system');
  }
  // rect（v1）仅 cartesian2D 有双 band cell 构造；其余坐标系（polar 虽有 projectCell 但无 rect cell 构造、1D / ternary / custom）→ fail-loud
  if (mark.type === PlotMark.Rect) {
    if (frame.type !== PlotCoordinate.Cartesian2D) {
      throw new Error(failLoudMessage(mark.type, frame.type));
    }
    assertRectBands(frame);
  }
  if (frame.projectCell === undefined) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  // interval 需 IntervalContext（buildIntervalContext 仅 cartesian / polar 帧有 primary scale 概念）；sector 无 ctx
  const ctx = mark.type === PlotMark.Interval && (frame.type === PlotCoordinate.Cartesian2D || frame.type === PlotCoordinate.Polar2D) ? buildIntervalContext(mark, frame, rows) : undefined;
  const layer = lowerCells(mark, rows, frame, frame.projectCell, ctx, colorOf, defaultColor, markProvenance, labelOf);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};
