import { type IRChild, type IRNode, type IRNodeDefault, type IRNodeLabel, type IRScope, type IRStep } from '@retikz/core';
import { isFiniteNumber } from '@retikz/math';
import { type ExternalRow, type IntervalMark, type LinkMark, type Mark, type PathMark, PlotMark, type PlotMarkValue, type PointMark, type ReferenceMark, type RegionMark } from '../ir';
import { type IntervalContext, LINK_DEFAULT_CURVATURE, buildIntervalContext, datumAnchor, linkBandGeometry, linkEndpoints, markCell, roleValues } from './anchor';
import { type FieldCollector, channelValue, compareByPath, inferCategoryDomain, resolveFieldPath } from '../data';
import {
  type CartesianCoordinateFrame,
  type Cell,
  type CellGeometry,
  type CoordinateFrame,
  type DimensionRole,
  type PolarCoordinateFrame,
  type PolarVertex,
  densifyPolarSegments,
  isCartesianCoordinateFrame,
  isPolarCoordinateFrame,
  isTernary2DCoordinateFrame,
  toPolarVertex,
} from '../coordinate';
import {
  type DatumIdRegistrar,
  type ProvenanceContext,
  datumMeta,
  markLayerId,
  markLayerMeta,
  readSourceIndex,
  readSourceIndices,
  seriesPathMeta,
  slug,
} from '../pipeline/provenance';
import { type NumberStyleOf, type OpacityOf, type ShapeOf, type SizeOf, type StrokeWidthOf } from '../scale/channel';

/**
 * 一个 mark 下沉时消费的通道解析器集合
 * @description color 适用所有 mark；size / opacity / shape 仅 PointMark（per-datum node 属性）。
 *   由 expand 据各通道 resolver 构造、整包传入，避免逐个位置参数（易错序）。
 */
export type MarkChannels = {
  colorOf?: ColorOf;
  defaultColor?: string;
  sizeOf?: SizeOf;
  opacityOf?: OpacityOf;
  shapeOf?: ShapeOf;
  strokeOf?: ColorOf;
  strokeWidthOf?: StrokeWidthOf;
  fillOpacityOf?: NumberStyleOf;
  drawOpacityOf?: NumberStyleOf;
  rotateOf?: NumberStyleOf;
  paddingOf?: NumberStyleOf;
  minimumSizeOf?: NumberStyleOf;
  minimumWidthOf?: NumberStyleOf;
  minimumHeightOf?: NumberStyleOf;
  zIndexOf?: NumberStyleOf;
  labelOf?: LabelOf;
};

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
const pointStyle = (fill: IRNodeDefault['fill'], mark: PointMark): IRNodeDefault => {
  const padding = mark.padding?.kind === 'constant' ? mark.padding.value : undefined;
  const minimumSize = mark.minimumSize?.kind === 'constant' ? mark.minimumSize.value : undefined;
  const minimumWidth = mark.minimumWidth?.kind === 'constant' ? mark.minimumWidth.value : undefined;
  const minimumHeight = mark.minimumHeight?.kind === 'constant' ? mark.minimumHeight.value : undefined;
  const stroke = mark.stroke?.kind === 'constant' ? mark.stroke.value : undefined;
  const strokeWidth = mark.strokeWidth?.kind === 'constant' ? mark.strokeWidth.value : undefined;
  const fillOpacity = mark.fillOpacity?.kind === 'constant' ? mark.fillOpacity.value : undefined;
  const drawOpacity = mark.drawOpacity?.kind === 'constant' ? mark.drawOpacity.value : undefined;
  const opacity = mark.opacity?.kind === 'constant' ? mark.opacity.value : undefined;
  const rotate = mark.rotate?.kind === 'constant' ? mark.rotate.value : undefined;
  return {
    shape: 'circle',
    padding: padding ?? 0,
    minimumSize: minimumSize ?? POINT_SIZE / Math.SQRT2,
    ...(minimumWidth !== undefined ? { minimumWidth } : {}),
    ...(minimumHeight !== undefined ? { minimumHeight } : {}),
    fill,
    ...(stroke !== undefined ? { stroke } : {}),
    ...(strokeWidth !== undefined ? { strokeWidth } : {}),
    ...(fillOpacity !== undefined ? { fillOpacity } : {}),
    ...(drawOpacity !== undefined ? { drawOpacity } : {}),
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
  };
};

/** 自由文本 node 样式（无 shape 边框：padding0 + 无描边 + textColor 上提到子 Scope；色走文本而非 fill） */
const textStyle = (textColor: string, mark: PointMark): IRNodeDefault => {
  const padding = mark.padding?.kind === 'constant' ? mark.padding.value : undefined;
  const opacity = mark.opacity?.kind === 'constant' ? mark.opacity.value : undefined;
  const rotate = mark.rotate?.kind === 'constant' ? mark.rotate.value : undefined;
  return {
    padding: padding ?? 0,
    strokeWidth: 0,
    textColor,
    ...(opacity !== undefined ? { opacity } : {}),
    ...(rotate !== undefined ? { rotate } : {}),
  };
};

/**
 * 取一行的位置通道值 → [xValue, yValue]（坐标系无关；投影交给 frame.project，frame 把 x/y 重解释为对应角色）
 * @description x/y 是唯一位置通道（坐标系决定其含义）；link 无位置通道（端点来自 source/target 字段对）→ 不走此路径。
 */
const resolveRolePosition = (mark: Mark, row: ExternalRow): [unknown, unknown] =>
  mark.type === PlotMark.Link ? [undefined, undefined] : [channelValue(mark.encoding.x, row), channelValue(mark.encoding.y, row)];

/** 柱 node 样式（rectangle + padding0 + 无描边，使 minimumWidth/Height 即真实柱尺寸） */
const barStyle = (fill: string): IRNodeDefault => ({ shape: 'rectangle', padding: 0, strokeWidth: 0, fill });

/**
 * datum node 装饰器：provenance 开时给 node 挂 per-datum meta（datumProvenance）+ datum id（datumIdField）
 * @description 关 provenance / 无 markProvenance → 原样返回（保默认逐字节等价）。
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
    decorated.meta = datumMeta(context, markType, markIndex, transformedIndex, readSourceIndex(row), seriesValue, readSourceIndices(row));
  }
  const datumId = registerDatumId?.(row);
  if (datumId !== undefined) decorated.id = datumId;
  return decorated;
};

/**
 * priority-1 宿主 label：若位置 mark 带 `label` 且该行解析出内容，给 datum Node 填 core NodeLabelSchema
 * @description 零新建 Node：position / distance / pin 直接落 core label（边框相对定位 + 引线由 core 负责）。
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

/**
 * point mark：每行一个 circle glyph 或无边框文本 Node（坐标系无关，经 frame.projectRoles 投影；吸收旧 text mark）
 * @description encoding.text 设 → 无边框带 text 的 Node（内容走 labelOf、缺失跳过、dx/dy 微调），样式走 textStyle（textColor）；
 *   否则 → circle glyph（size / opacity / shape 通道 per-datum、datum label 经 attachDatumLabel），样式走 pointStyle（fill）。
 */
const lowerPoint = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== PlotMark.Point) return null;
  const {
    colorOf,
    defaultColor = DEFAULT_FILL,
    sizeOf,
    opacityOf,
    shapeOf,
    strokeOf,
    strokeWidthOf,
    fillOpacityOf,
    drawOpacityOf,
    rotateOf,
    paddingOf,
    minimumSizeOf,
    minimumWidthOf,
    minimumHeightOf,
    zIndexOf,
    labelOf,
  } = channels;
  const isText = mark.encoding.text !== undefined;
  const dx = mark.dx ?? 0;
  const dy = mark.dy ?? 0;
  const constantZIndex = mark.zIndex?.kind === 'constant' ? mark.zIndex.value : undefined;
  const placed: Array<{ color: string | undefined; node: IRNode }> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex++) {
    const row = rows[transformedIndex];
    const applyDynamicNodeStyle = (node: IRNode): void => {
      const padding = paddingOf?.(row);
      if (padding !== undefined) node.padding = padding;
      const minimumSize = minimumSizeOf?.(row);
      if (minimumSize !== undefined) node.minimumSize = minimumSize;
      const minimumWidth = minimumWidthOf?.(row);
      if (minimumWidth !== undefined) node.minimumWidth = minimumWidth;
      const minimumHeight = minimumHeightOf?.(row);
      if (minimumHeight !== undefined) node.minimumHeight = minimumHeight;
      const fillOpacity = fillOpacityOf?.(row);
      if (fillOpacity !== undefined) node.fillOpacity = fillOpacity;
      const drawOpacity = drawOpacityOf?.(row);
      if (drawOpacity !== undefined) node.drawOpacity = drawOpacity;
      const opacity = opacityOf?.(row);
      if (opacity !== undefined) node.opacity = opacity;
      const rotate = rotateOf?.(row);
      if (rotate !== undefined) node.rotate = rotate;
      const zIndex = zIndexOf?.(row) ?? constantZIndex;
      if (zIndex !== undefined) node.zIndex = zIndex;
    };
    if (isText) {
      // 文本 glyph：投影同 point（roleValues + projectRoles，坐标系无关）；内容缺失跳过；dx/dy 锚点像素微调
      const point = frame.projectRoles(roleValues(mark, row, frame));
      if (!point) continue;
      const text = labelOf?.(row);
      if (text === undefined) continue;
      const position: [number, number] = dx === 0 && dy === 0 ? point : [point[0] + dx, point[1] + dy];
      const base: IRNode = { type: 'node', position, text };
      applyDynamicNodeStyle(base);
      placed.push({ color: colorOf?.(row), node: decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined) });
      continue;
    }
    // 散点 glyph：锚点与 locator 共享同一 datumAnchor（point → frame.projectRoles），杜绝两套投影漂移
    const point = datumAnchor(mark, row, frame);
    if (!point) continue;
    const base: IRNode = { type: 'node', position: point };
    applyDynamicNodeStyle(base);
    const radius = sizeOf?.(row);
    if (radius !== undefined) base.minimumSize = radius * Math.SQRT2;
    const shape = shapeOf?.(row);
    if (shape !== undefined) base.shape = shape;
    const stroke = strokeOf?.(row);
    if (stroke !== undefined) base.stroke = stroke;
    const strokeWidth = strokeWidthOf?.(row);
    if (strokeWidth !== undefined) base.strokeWidth = strokeWidth;
    const node = attachDatumLabel(decorateDatum(base, row, transformedIndex, mark.type, markProvenance, undefined), mark, row, labelOf);
    placed.push({ color: colorOf?.(row), node });
  }
  if (placed.length === 0) return null;
  const fillConstant = mark.fill?.kind === 'constant' ? mark.fill.value : undefined;
  const layer: IRScope = !colorOf
    ? {
        type: 'scope',
        nodeDefault: isText ? textStyle(typeof fillConstant === 'string' ? fillConstant : defaultColor, mark) : pointStyle(fillConstant ?? defaultColor, mark),
        children: placed.map(p => p.node),
      }
    : colorGroupedScope(placed, fill => (isText ? textStyle(fill, mark) : pointStyle(fill, mark)));
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
 * CellGeometry → core Node（统一装配）
 * @description rect → Node{position, minimumWidth, minimumHeight}；sector → Node{position:center, shape:sector}
 *   （半径 swap 保 outer>inner）；contour → Node{position: 顶点 AABB 中心, shape:contour{points}}。
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

/** interval cell 类 mark 某行的 series 值（写进 datum meta；series 字段拆分） */
const cellSeriesValue = (mark: Mark, row: ExternalRow): unknown =>
  mark.type === PlotMark.Interval && mark.series !== undefined ? resolveFieldPath(row, mark.series) : undefined;

/**
 * interval 单路径下沉：算 cell → frame.projectCell → CellGeometry → 装配 Node（坐标系无关）
 * @description 判断挪进坐标系（frame.projectCell 产 rect / sector / contour），mark 侧零分叉。装配样式按 geometry
 *   kind 选（rect → 矩形 barStyle、sector / contour → shapeStyle）。无可绘制图元返回 null。
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
    const cell = markCell(mark, row, frame, ctx);
    if (!cell) continue;
    const geometry = projectCell(cell);
    if (geometry.kind === 'contour' && geometry.points.length < 3) continue;
    kind = geometry.kind;
    const node = attachDatumLabel(
      decorateDatum(cellGeometryNode(geometry), row, transformedIndex, mark.type, markProvenance, cellSeriesValue(mark, row)),
      mark,
      row,
      labelOf,
    );
    placed.push({ color: colorOf?.(row), node });
  }
  return placed.length === 0 || kind === undefined ? null : cellLayer(placed, kind, colorOf, defaultColor);
};

/** interval mark 图层下沉：坐标系守卫 + IntervalContext + lowerCells（cell 类单路径） */
const lowerIntervalLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== PlotMark.Interval) return null;
  // interval 需内建正交 cell：cartesian2D / polar2D / ternary2D；其余坐标系 fail-loud
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame) && !isTernary2DCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const ctx = isCartesianCoordinateFrame(frame) || isPolarCoordinateFrame(frame) ? buildIntervalContext(mark, frame, rows) : undefined;
  const layer = lowerCells(mark, rows, frame, frame.projectCell, ctx, channels.colorOf, channels.defaultColor, markProvenance, channels.labelOf);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** region mark 的默认 baseline（回边贴的值；cartesian = y 基线、polar = 径向内界方向） */
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

/** 按 order / 数据序排好一组行（path / region 共用连接顺序） */
const orderRows = (rows: Array<ExternalRow>, order: string | undefined): Array<ExternalRow> =>
  order ? [...rows].sort((a, b) => compareByPath(a, b, order)) : rows;

/**
 * 把一组有序行投影成上沿屏幕点（坐标系无关）
 * @description cartesian / polar 分类角轴 / closed 走弦（顶点直连）；polar 连续角轴段内采样弯弧。
 */
const buildOutlinePoints = (mark: Mark, ordered: Array<ExternalRow>, frame: CoordinateFrame, closed: boolean): Array<[number, number]> => {
  if (isPolarCoordinateFrame(frame) && frame.continuousAngle && !closed) {
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
  pointsToSteps(buildOutlinePoints(mark, orderRows(rows, mark.type === PlotMark.Path || mark.type === PlotMark.Region ? mark.order : undefined), frame, closed), closed);

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
 * 显式 series + color 字段并存时，校验 color 在每个 series 组内恒定（否则 fail-loud）
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
 * path mark（path / region）的有效 series 字段
 * @description 显式 mark.series 优先；无显式 series 但有 categorical color 字段 → 隐式按 color 拆系列。
 *   显式 series 与 color 字段并存且 color 在 series 内不恒定 → fail-loud。
 */
const pathSeriesField = (mark: Mark, rows: Array<ExternalRow>): string | undefined => {
  if (mark.type !== PlotMark.Path && mark.type !== PlotMark.Region) return undefined;
  const colorField = mark.encoding.color?.field;
  if (mark.series) {
    if (colorField && colorField !== mark.series) assertColorConstantWithinSeries(rows, mark.series, colorField);
    return mark.series;
  }
  return colorField;
};

/** 折线（path mark）：单线（常量 color → stroke）或多系列（series 拆多线、各取系列色）（坐标系无关） */
const lowerPath = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, defaultColor: string | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  if (mark.type !== PlotMark.Path) return null;
  const closed = mark.closed ?? false;
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

/** 把一个 region 的上沿 + baseline 回边连成可填充 Path 的 steps；上沿 < 2 点返回 null */
const buildAreaSteps = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, baseline: number): Array<IRStep> | null => {
  const ordered = orderRows(rows, mark.type === PlotMark.Region ? mark.order : undefined);
  const closed = mark.type === PlotMark.Region ? (mark.closed ?? false) : false;
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

/** 区域（region mark）：上沿折线 + baseline 回边闭合的可填充 Path（坐标系无关）；单系列或多系列 */
const lowerRegion = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, defaultColor: string | undefined, markProvenance: MarkProvenance | undefined): IRScope | null => {
  if (mark.type !== PlotMark.Region) return null;
  const baseline = mark.baseline ?? AREA_BASELINE;
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

/** link 最大带宽（user units）：合成 width 线性 scale 的 range 上界（value 域 max → 此宽） */
const LINK_MAX_WIDTH = 40;

/**
 * 合成 link 的 value → 半宽（user units）映射：线性 [0, maxValue] → [0, LINK_MAX_WIDTH/2]
 */
const linkHalfWidthOf = (mark: LinkMark, rows: Array<ExternalRow>): ((value: number) => number) => {
  let maxValue = 0;
  const consider = (raw: unknown): void => {
    if (isFiniteNumber(raw) && Math.abs(raw) > maxValue) maxValue = Math.abs(raw);
  };
  for (const row of rows) {
    consider(resolveFieldPath(row, mark.value));
    if (mark.endWidth !== undefined) consider(resolveFieldPath(row, mark.endWidth));
  }
  const halfMax = LINK_MAX_WIDTH / 2;
  return value => (maxValue > 0 ? (value / maxValue) * halfMax : 0);
};

/** link 一行的 value（流量）：非有限 / 缺失 → null（跳过该行）；负值 → fail-loud（负流不静默歪曲） */
const linkValueOf = (row: ExternalRow, field: string): number | null => {
  const raw = resolveFieldPath(row, field);
  if (!isFiniteNumber(raw)) return null;
  if (raw < 0) {
    throw new Error(`lowerPlots: link mark requires non-negative ${field} (got ${raw}); negative flow cannot be drawn as a band width`);
  }
  return raw;
};

/**
 * 流带（link mark）下沉：每行 → 一条可填充 cubic 曲带 Path（坐标系无关端点投影 + 屏幕空间几何）
 */
const lowerLink = (mark: LinkMark, rows: Array<ExternalRow>, frame: CoordinateFrame, colorOf: ColorOf | undefined, defaultColor: string | undefined): IRScope | null => {
  if (mark.width !== undefined) {
    throw new Error(`lowerPlots: link mark named width scale "${mark.width}" is not supported this round; omit width for a synthesized linear scale`);
  }
  const halfWidthOf = linkHalfWidthOf(mark, rows);
  const curvature = mark.curvature ?? LINK_DEFAULT_CURVATURE;
  const placed: Array<{ color: string | undefined; steps: Array<IRStep> }> = [];
  for (const row of rows) {
    const value = linkValueOf(row, mark.value);
    if (value === null) continue;
    const endValue = mark.endWidth !== undefined ? linkValueOf(row, mark.endWidth) : value;
    if (endValue === null) continue;
    const halfSource = halfWidthOf(value);
    const halfTarget = halfWidthOf(endValue);
    if (!(halfSource > 1e-9) && !(halfTarget > 1e-9)) continue;
    const endpoints = linkEndpoints(mark, row, frame);
    if (endpoints === null) continue;
    const geometry = linkBandGeometry(endpoints.source, endpoints.target, halfSource, halfTarget, curvature, mark.orientation ?? 'horizontal');
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

/** reference 描边宽度（参考线；与 path mark 同宽，视觉一致） */
const REFERENCE_STROKE_WIDTH = LINE_STROKE_WIDTH;

/**
 * reference 取向：恰好绑 encoding.x（竖直）或 encoding.y（水平）之一；皆设 / 皆缺 → fail-loud
 */
const referenceOrientation = (mark: ReferenceMark): 'x' | 'y' => {
  const hasX = mark.encoding.x !== undefined;
  const hasY = mark.encoding.y !== undefined;
  if (hasX === hasY) {
    throw new Error('lowerPlots: reference mark must bind exactly one of encoding.x (vertical) or encoding.y (horizontal); set one, not both / neither');
  }
  return hasX ? 'x' : 'y';
};

/**
 * reference 的对侧维（垂直于常量轴）输出区间：默认满铺该轴 range，extent 字段给定时截成 [extentLo, extentTo] 输出坐标
 */
const referenceSpanInterval = (mark: ReferenceMark, row: ExternalRow, oppositeCoordinate: (value: unknown) => number, oppositeRange: [number, number]): [number, number] | null => {
  const hasFrom = mark.extentField !== undefined;
  const hasTo = mark.extentToField !== undefined;
  if (hasFrom !== hasTo) {
    throw new Error('lowerPlots: reference mark extentField / extentToField must be set together (a partial-length span needs both start and end)');
  }
  if (!hasFrom) return oppositeRange;
  const lo = oppositeCoordinate(resolveFieldPath(row, mark.extentField as string));
  const hi = oppositeCoordinate(resolveFieldPath(row, mark.extentToField as string));
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
};

/** reference line 某行的常量轴值（绑 x → encoding.x、绑 y → encoding.y；value 常量 / field per-datum 均经 channelValue） */
const referenceConstantValue = (mark: ReferenceMark, row: ExternalRow, orientation: 'x' | 'y'): unknown =>
  channelValue(orientation === 'x' ? mark.encoding.x : mark.encoding.y, row);

/** reference band 某行的上界值（绑 x → xTo、绑 y → yTo；number 常量 / string field per-datum） */
const referenceUpperValue = (mark: ReferenceMark, row: ExternalRow, orientation: 'x' | 'y'): unknown => {
  const bound = orientation === 'x' ? mark.xTo : mark.yTo;
  return typeof bound === 'string' ? resolveFieldPath(row, bound) : bound;
};

/** reference 是否 band 形态（绑定维度上给了匹配的上界 xTo / yTo）；并校验上界与所绑维度匹配（不匹配 / 单飞 → fail-loud） */
const isReferenceBand = (mark: ReferenceMark, orientation: 'x' | 'y'): boolean => {
  if (orientation === 'x' && mark.yTo !== undefined) {
    throw new Error('lowerPlots: reference mark binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)');
  }
  if (orientation === 'y' && mark.xTo !== undefined) {
    throw new Error('lowerPlots: reference mark binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)');
  }
  return (orientation === 'x' ? mark.xTo : mark.yTo) !== undefined;
};

/**
 * reference 是否完全常量（单条 full-span line / band，不逐行）：常量轴是 value、band 上界是 number、无 extent field
 */
const isReferenceConstant = (mark: ReferenceMark, orientation: 'x' | 'y'): boolean => {
  const constantChannel = orientation === 'x' ? mark.encoding.x : mark.encoding.y;
  if (constantChannel?.field !== undefined) return false;
  const upper = orientation === 'x' ? mark.xTo : mark.yTo;
  if (typeof upper === 'string') return false;
  return mark.extentField === undefined && mark.extentToField === undefined;
};

/** reference 的有效迭代行：全常量 → 单行代表（任取首行，无行则空对象）；per-datum → 原数据行 */
const referenceRows = (mark: ReferenceMark, rows: Array<ExternalRow>, orientation: 'x' | 'y'): Array<ExternalRow> =>
  isReferenceConstant(mark, orientation) ? [rows[0] ?? {}] : rows;

/** reference line 某行 → core Path steps（cartesian 直连两端点；polar 竖直径向线直连、水平常半径环段采样）；退化 → null */
const referenceLineSteps = (mark: ReferenceMark, row: ExternalRow, frame: CartesianCoordinateFrame | PolarCoordinateFrame, orientation: 'x' | 'y'): Array<IRStep> | null => {
  const constantValue = referenceConstantValue(mark, row, orientation);
  if (isCartesianCoordinateFrame(frame)) {
    const constant = frame[orientation === 'x' ? 'primary' : 'secondary'].coordinate(constantValue);
    if (!Number.isFinite(constant)) return null;
    const opposite = orientation === 'x' ? frame.secondary : frame.primary;
    const span = referenceSpanInterval(mark, row, opposite.coordinate, opposite.range());
    if (span === null) return null;
    const start: [number, number] = orientation === 'x' ? [constant, span[0]] : [span[0], constant];
    const end: [number, number] = orientation === 'x' ? [constant, span[1]] : [span[1], constant];
    return pointsToSteps([start, end], false);
  }
  if (orientation === 'x') {
    const theta = frame.primary.coordinate(constantValue);
    if (!Number.isFinite(theta)) return null;
    const span = referenceSpanInterval(mark, row, frame.secondary.coordinate, [frame.innerRadius, frame.outerRadius]);
    if (span === null) return null;
    const inner = frame.projectPolar(theta, span[0]);
    const outer = frame.projectPolar(theta, span[1]);
    return inner && outer ? pointsToSteps([inner, outer], false) : null;
  }
  const radius = frame.secondary.coordinate(constantValue);
  if (!Number.isFinite(radius)) return null;
  const angleSpan = referenceSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
  if (angleSpan === null) return null;
  const points = densifyPolarSegments(frame, [
    { theta: angleSpan[0], radius },
    { theta: angleSpan[1], radius },
  ]);
  return pointsToSteps(points, false);
};

/** reference band 某行 → 正交 Cell（cartesian primary/secondary 为像素带、polar primary 为角度带 / secondary 为半径带）；退化 → null */
const referenceBandCell = (mark: ReferenceMark, row: ExternalRow, frame: CartesianCoordinateFrame | PolarCoordinateFrame, orientation: 'x' | 'y'): Cell | null => {
  const lo = referenceConstantValue(mark, row, orientation);
  const hi = referenceUpperValue(mark, row, orientation);
  if (isCartesianCoordinateFrame(frame)) {
    const constScale = orientation === 'x' ? frame.primary : frame.secondary;
    const c0 = constScale.coordinate(lo);
    const c1 = constScale.coordinate(hi);
    if (!Number.isFinite(c0) || !Number.isFinite(c1)) return null;
    const opposite = orientation === 'x' ? frame.secondary : frame.primary;
    const span = referenceSpanInterval(mark, row, opposite.coordinate, opposite.range());
    if (span === null) return null;
    return { intervals: orientation === 'x' ? { x: [c0, c1], y: span } : { x: span, y: [c0, c1] } };
  }
  if (orientation === 'y') {
    const r0 = frame.secondary.coordinate(lo);
    const r1 = frame.secondary.coordinate(hi);
    if (!Number.isFinite(r0) || !Number.isFinite(r1)) return null;
    const angleSpan = referenceSpanInterval(mark, row, frame.primary.coordinate, [frame.startAngle, frame.endAngle]);
    if (angleSpan === null) return null;
    return { intervals: { x: angleSpan, y: [r0, r1] } };
  }
  const a0 = frame.primary.coordinate(lo);
  const a1 = frame.primary.coordinate(hi);
  if (!Number.isFinite(a0) || !Number.isFinite(a1)) return null;
  const radiusSpan = referenceSpanInterval(mark, row, frame.secondary.coordinate, [frame.innerRadius, frame.outerRadius]);
  if (radiusSpan === null) return null;
  return { intervals: { x: [a0, a1], y: radiusSpan } };
};

/**
 * 参考标注（reference mark）下沉：line → core Path（每行一条）、band → projectCell Node（每行一个）
 */
const lowerReference = (
  mark: ReferenceMark,
  rows: Array<ExternalRow>,
  frame: CartesianCoordinateFrame | PolarCoordinateFrame,
  colorOf: ColorOf | undefined,
  defaultColor: string | undefined,
  markProvenance: MarkProvenance | undefined,
): IRScope | null => {
  const orientation = referenceOrientation(mark);
  if (isReferenceConstant(mark, orientation) && mark.encoding.color?.field !== undefined) {
    throw new Error(
      `lowerPlots: a constant reference (single full-span line) cannot use a per-datum color field "${mark.encoding.color.field}"; use a constant color value, or bind a per-datum position field`,
    );
  }
  const band = isReferenceBand(mark, orientation);
  const effectiveRows = referenceRows(mark, rows, orientation);

  if (band) {
    const placed: Array<{ color: string | undefined; node: IRNode }> = [];
    let kind: CellGeometry['kind'] | undefined;
    for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
      const row = effectiveRows[transformedIndex];
      const cell = referenceBandCell(mark, row, frame, orientation);
      if (!cell) continue;
      const geometry = frame.projectCell(cell);
      kind = geometry.kind;
      const node = decorateDatum(cellGeometryNode(geometry), row, transformedIndex, mark.type, markProvenance, undefined);
      placed.push({ color: colorOf?.(row), node });
    }
    if (placed.length === 0 || kind === undefined) return null;
    if (!colorOf) {
      const colorValue = mark.encoding.color?.value;
      const fill = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
      return { type: 'scope', nodeDefault: styleForGeometry(kind)(fill), children: placed.map(p => p.node) };
    }
    return cellLayer(placed, kind, colorOf, defaultColor);
  }

  const placed: Array<{ color: string | undefined; steps: Array<IRStep>; row: ExternalRow; transformedIndex: number }> = [];
  for (let transformedIndex = 0; transformedIndex < effectiveRows.length; transformedIndex++) {
    const row = effectiveRows[transformedIndex];
    const steps = referenceLineSteps(mark, row, frame, orientation);
    if (!steps) continue;
    placed.push({ color: colorOf?.(row), steps, row, transformedIndex });
  }
  if (placed.length === 0) return null;
  if (!colorOf) {
    const colorValue = mark.encoding.color?.value;
    const stroke = colorValue !== undefined ? String(colorValue) : defaultColor ?? DEFAULT_FILL;
    return { type: 'scope', pathDefault: { stroke, strokeWidth: REFERENCE_STROKE_WIDTH }, children: placed.map(p => ({ type: 'path', children: p.steps })) };
  }
  const groups = new Map<string, Array<IRChild>>();
  for (const { color, steps } of placed) {
    const stroke = color ?? DEFAULT_FILL;
    const path: IRChild = { type: 'path', children: steps };
    const bucket = groups.get(stroke);
    if (bucket) bucket.push(path);
    else groups.set(stroke, [path]);
  }
  const children: Array<IRChild> = [...groups].map(([stroke, paths]) => ({ type: 'scope', pathDefault: { stroke }, children: paths }));
  return { type: 'scope', pathDefault: { strokeWidth: REFERENCE_STROKE_WIDTH }, children };
};

/**
 * 坐标系不支持某 mark 的统一 fail-loud 文案（含 mark.type / frame.type，便于定位）
 */
const failLoudMessage = (markType: string, frameType: string): string =>
  `lowerPlots: ${markType} mark is not supported under the ${frameType} coordinate system (this coordinate system does not provide the geometry for ${markType} marks this round)`;

/** path / region 图层下沉：仅 cartesian2D / polar2D 有上沿 / 回边几何；其余坐标系 fail-loud + attachMarkLayer */
const lowerPathLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerPath(mark, rows, frame, channels.colorOf, channels.defaultColor, markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

const lowerRegionLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerRegion(mark, rows, frame, channels.colorOf, channels.defaultColor, markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** link 图层下沉：本轮仅 cartesian2D（非笛卡尔曲带形态顺延），其余坐标系 fail-loud + attachMarkLayer */
const lowerLinkLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== PlotMark.Link) return null;
  if (!isCartesianCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerLink(mark, rows, frame, channels.colorOf, channels.defaultColor);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/** reference 图层下沉：line 走 core Path、band 走 projectCell；本轮仅 cartesian2D / polar2D，其余坐标系 fail-loud + attachMarkLayer */
const lowerReferenceLayer = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, markProvenance: MarkProvenance | undefined): IRChild | null => {
  if (mark.type !== PlotMark.Reference) return null;
  if (!isCartesianCoordinateFrame(frame) && !isPolarCoordinateFrame(frame)) {
    throw new Error(failLoudMessage(mark.type, frame.type));
  }
  const layer = lowerReference(mark, rows, frame, channels.colorOf, channels.defaultColor, markProvenance);
  return layer === null ? null : attachMarkLayer(layer, mark, markProvenance);
};

/**
 * mark lowering 行为注册项（按 type 查找分发；行为函数不进 IR）
 * @description IR schema 仍是 ir/mark.ts 静态单一真源；本接口只承载「某 mark type 怎么下沉成 core IR」的行为，
 *   对齐仓库已有的 composite / coordinate 工厂注册范式。
 */
export type MarkDefinition<T extends Mark = Mark> = {
  /** 注册键（= IR 判别串，对应 ir/mark.ts 静态 schema 的成员） */
  type: PlotMarkValue;
  /** 收集该 mark 额外引用的用户源字段；通用 encoding / label 字段由 data 层统一处理 */
  collectFields?: (mark: T, fields: FieldCollector) => void;
  /** 位置通道必填性：坐标系级校验（省略 → 由各 lower 自行 fail-loud） */
  requiredRoles?: (frame: CoordinateFrame) => ReadonlyArray<DimensionRole>;
  /** 区间类 mark：某行 → 正交 Cell（interval 用；非区间类省略） */
  buildCell?: (mark: T, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext) => Cell | null;
  /** 下沉到 core IR 图层（无可绘制图元返回 null；不支持的 mark × coordinate 由实现 fail-loud） */
  lower: (mark: T, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels, prov?: MarkProvenance) => IRChild | null;
};

const collectPositionalFields = (mark: PointMark | PathMark | RegionMark | IntervalMark, fields: FieldCollector): void => {
  fields.addChannel(mark.encoding.x);
  fields.addChannel(mark.encoding.y);
  fields.addChannel(mark.encoding.z);
  if ('color' in mark.encoding) fields.addChannel(mark.encoding.color);
  fields.addChannel(mark.label?.content);
};

/**
 * mark lowering 行为注册表：内置 6 个 mark = 6 个内置注册项（lowerMark 按 type 查表分发）
 * @description 对齐仓库已有 composite / coordinate 工厂注册范式；新增内置 mark = 加一条注册项，不改 lowerMark。
 *   IR schema 仍是 ir/mark.ts 静态单一真源（不由此表组装）。
 */
export const MARK_REGISTRY: Record<PlotMarkValue, MarkDefinition> = {
  [PlotMark.Point]: {
    type: PlotMark.Point,
    collectFields: (mark, fields) => {
      if (mark.type !== PlotMark.Point) return;
      collectPositionalFields(mark, fields);
      fields.addChannel(mark.color);
      fields.addChannel(mark.size);
      fields.addChannel(mark.shape);
      fields.addChannel(mark.fill);
      fields.addChannel(mark.stroke);
      fields.addChannel(mark.strokeWidth);
      fields.addChannel(mark.fillOpacity);
      fields.addChannel(mark.drawOpacity);
      fields.addChannel(mark.opacity);
      fields.addChannel(mark.rotate);
      fields.addChannel(mark.padding);
      fields.addChannel(mark.minimumSize);
      fields.addChannel(mark.minimumWidth);
      fields.addChannel(mark.minimumHeight);
      fields.addChannel(mark.zIndex);
      fields.addChannel(mark.encoding.text);
    },
    lower: lowerPoint,
  },
  [PlotMark.Path]: {
    type: PlotMark.Path,
    collectFields: (mark, fields) => {
      if (mark.type !== PlotMark.Path) return;
      collectPositionalFields(mark, fields);
      fields.addFields(mark.order, mark.series);
    },
    lower: lowerPathLayer,
  },
  [PlotMark.Region]: {
    type: PlotMark.Region,
    collectFields: (mark, fields) => {
      if (mark.type !== PlotMark.Region) return;
      collectPositionalFields(mark, fields);
      fields.addFields(mark.order, mark.series);
    },
    lower: lowerRegionLayer,
  },
  [PlotMark.Interval]: {
    type: PlotMark.Interval,
    collectFields: (mark, fields) => {
      if (mark.type !== PlotMark.Interval) return;
      collectPositionalFields(mark, fields);
      fields.addField(mark.series);
      const bounds = [mark.bounds?.x, mark.bounds?.y, mark.bounds?.z];
      for (const bound of bounds) {
        if (bound?.kind === 'extent') fields.addFields(bound.from, bound.to);
      }
    },
    buildCell: (mark, row, frame, ctx) => markCell(mark, row, frame, ctx),
    lower: lowerIntervalLayer,
  },
  [PlotMark.Link]: {
    type: PlotMark.Link,
    collectFields: (mark, fields) => {
      if (mark.type !== PlotMark.Link) return;
      fields.addChannel(mark.source.x);
      fields.addChannel(mark.source.y);
      fields.addChannel(mark.target.x);
      fields.addChannel(mark.target.y);
      fields.addFields(mark.value, mark.endWidth);
    },
    lower: lowerLinkLayer,
  },
  [PlotMark.Reference]: {
    type: PlotMark.Reference,
    collectFields: (mark, fields) => {
      if (mark.type !== PlotMark.Reference) return;
      fields.addChannel(mark.encoding.x);
      fields.addChannel(mark.encoding.y);
      fields.addChannel(mark.encoding.z);
      if ('color' in mark.encoding) fields.addChannel(mark.encoding.color);
      fields.addFields(typeof mark.xTo === 'string' ? mark.xTo : undefined, typeof mark.yTo === 'string' ? mark.yTo : undefined, mark.extentField, mark.extentToField);
    },
    lower: lowerReferenceLayer,
  },
};

export const collectMarkFields = (mark: Mark, fields: FieldCollector): void => {
  MARK_REGISTRY[mark.type].collectFields?.(mark, fields);
};

/**
 * 把一个 mark + 数据行下沉成一个图层 Scope（按 mark type 查 registry 分发）
 * @description **原则：尽可能用 Scope 承载共享信息，把每个 Node / Path 压到最小，以减小生成的 core IR 体积。**
 *   color 编码时按颜色分子 Scope；series 把记录拆成多系列（多线 / 分组 / 堆叠柱）。无可绘制图元返回 null。
 *   markProvenance 给定（provenance 开）→ 给图层 / series Path / datum Node 绑 id + 来源 meta。
 */
export const lowerMark = (mark: Mark, rows: Array<ExternalRow>, frame: CoordinateFrame, channels: MarkChannels = {}, markProvenance?: MarkProvenance): IRChild | null =>
  MARK_REGISTRY[mark.type].lower(mark, rows, frame, channels, markProvenance);
