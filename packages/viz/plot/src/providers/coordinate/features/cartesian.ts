import type { IRNode, IRScope } from '@retikz/core';
import type { Position } from '@retikz/math';

import type {
  AnyCoordinateDefinition,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  CoordinateFrame,
  DimensionRole,
  GuideContext,
  LoweredGuide,
  PositionScale,
  TickSet,
} from '../../../contract';
import type {
  Cartesian1DOrientationType,
  IRPlotCartesian1DCoordinate,
  IRPlotCoordinate,
  IRPlotScaleOperation,
} from '../../../schemas';
import type { Margins, Rect } from '../../../shared';

import { cellInterval } from '../../../contract';
import {
  AxisPlacementKind,
  Cartesian1DOrientation,
  Cartesian1DSchema,
  Cartesian2DSchema,
  PlotCoordinate,
  PlotScale,
} from '../../../schemas';
import { computePlotArea, estimateLabelWidth } from '../../../shared';
import { assertUniqueAxisPlacement } from '../shared';

type Cartesian2DCoordinate = Extract<IRPlotCoordinate, { type: typeof PlotCoordinate.Cartesian2D }>;

/** 空刻度集：某维度无 axis 时给 GuideContext 的占位 */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/** tick label 视觉外延反馈到 plotArea 的最大收敛轮数 */
const MAX_GUIDE_LAYOUT_PASSES = 3;

/** guide 文本节点在 Plot allocation 坐标中的估算边界 */
type TextNodeBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** 将 TextBlock 投影为与 guide 标签布局一致的测量字符串 */
const textBlockMeasureText = (text: IRNode['text']): string => {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  return text
    .map(line => {
      if (typeof line === 'string') return line;
      if ('text' in line) return line.text;
      return line.runs.map(run => ('text' in run ? run.text : run.tex)).join('');
    })
    .join('\n');
};

/** 估算已经完成旋转与端点对齐的 guide 文本节点视觉边界 */
const textNodeBoundsOf = (node: IRNode, fallbackFontSize: number): TextNodeBounds | undefined => {
  if (node.text === undefined || !Array.isArray(node.position)) return undefined;
  const [x, y] = node.position;
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;
  const authoredFontSize = node.font?.size;
  const fontSize = typeof authoredFontSize === 'number' ? authoredFontSize : fallbackFontSize;
  const width = Math.min(estimateLabelWidth(textBlockMeasureText(node.text), fontSize), node.maxTextWidth ?? Infinity);
  const height = typeof node.lineHeight === 'number' ? node.lineHeight : fontSize;
  const localMinX = node.align === 'start' ? 0 : node.align === 'end' ? -width : -width / 2;
  const localMaxX = node.align === 'start' ? width : node.align === 'end' ? 0 : width / 2;
  const localMinY = -height / 2;
  const localMaxY = height / 2;
  const radians = ((node.rotate ?? 0) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    [localMinX, localMinY],
    [localMinX, localMaxY],
    [localMaxX, localMinY],
    [localMaxX, localMaxY],
  ].map(([localX, localY]) => [x + localX * cos - localY * sin, y + localX * sin + localY * cos]);
  return {
    minX: Math.min(...corners.map(([cornerX]) => cornerX)),
    minY: Math.min(...corners.map(([, cornerY]) => cornerY)),
    maxX: Math.max(...corners.map(([cornerX]) => cornerX)),
    maxY: Math.max(...corners.map(([, cornerY]) => cornerY)),
  };
};

const isNodeChild = (child: IRScope['children'][number]): child is IRNode =>
  child.type === 'node' && 'position' in child;

const isScopeChild = (child: IRScope['children'][number]): child is IRScope =>
  child.type === 'scope' && 'children' in child;

/** 收集轴层中的文本节点；mark 与 grid 不参与坐标轴外延测量 */
const collectAxisTextNodes = (scope: IRScope): Array<IRNode> =>
  scope.children.flatMap(child => {
    if (isNodeChild(child)) return child.text === undefined ? [] : [child];
    if (isScopeChild(child)) return collectAxisTextNodes(child);
    return [];
  });

/** 计算最终可见 tick labels 相对 Plot allocation 四边的视觉溢出 */
const guideOverflowOf = (
  guides: ReadonlyArray<LoweredGuide>,
  tickLabelsByGuide: ReadonlyArray<ReadonlySet<string>>,
  width: number,
  height: number,
  fontSize: number,
): Margins => {
  const bounds = guides.flatMap((guide, guideIndex) =>
    guide.axisLayer === null
      ? []
      : collectAxisTextNodes(guide.axisLayer)
          .filter(node => tickLabelsByGuide[guideIndex]?.has(textBlockMeasureText(node.text)) === true)
          .flatMap(node => {
            const nodeBounds = textNodeBoundsOf(node, fontSize);
            return nodeBounds === undefined ? [] : [nodeBounds];
          }),
  );
  if (bounds.length === 0) return { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    top: Math.max(0, -Math.min(...bounds.map(item => item.minY))),
    right: Math.max(0, Math.max(...bounds.map(item => item.maxX)) - width),
    bottom: Math.max(0, Math.max(...bounds.map(item => item.maxY)) - height),
    left: Math.max(0, -Math.min(...bounds.map(item => item.minX))),
  };
};

/** 合并 composition/decorations 与 guide 反馈的额外留白 */
const addMarginReserve = (base: Partial<Margins> | undefined, extra: Margins): Margins => ({
  top: (base?.top ?? 0) + extra.top,
  right: (base?.right ?? 0) + extra.right,
  bottom: (base?.bottom ?? 0) + extra.bottom,
  left: (base?.left ?? 0) + extra.left,
});

/** 仅连续数值 scale 的显式 range 会阻止坐标系把 range 收敛到 plotArea（自定义 type 无内置 range 语义、按可收敛处理） */
const hasExplicitContinuousRange = (def: IRPlotScaleOperation): boolean =>
  (def.type === PlotScale.Linear ||
    def.type === PlotScale.Log ||
    def.type === PlotScale.Pow ||
    def.type === PlotScale.Sqrt ||
    def.type === PlotScale.Symlog ||
    def.type === PlotScale.Radial) &&
  'range' in def &&
  def.range !== undefined;

/**
 * 二维笛卡尔运行时坐标帧。
 * @description 由 IR 坐标配置和 x/y scale 解析得到，lowering 阶段通过它把数据通道值投影成屏幕坐标。
 *   该类型描述可执行的投影能力，不等同于 schemas 层的 JSON IR 类型
 */
export type CartesianCoordinateFrame = {
  /** 判别字段：2D 笛卡尔 */
  type: typeof PlotCoordinate.Cartesian2D;
  /** 位置角色序（[x, y]）；mark 按此序取 encoding 通道值 */
  roles: ReadonlyArray<DimensionRole>;
  /** x（水平）位置 scale */
  primary: PositionScale;
  /** y（垂直）位置 scale */
  secondary: PositionScale;
  /** 按通用 coordinate contract 暴露各 role 的位置 scale */
  roleScales: Partial<Record<DimensionRole, PositionScale>>;
  /** 投影：[primary.coordinate(x), secondary.coordinate(y)]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值（[x, y]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /** 原始 x/y 经 position scale 映射 */
  mapRoles: (values: ReadonlyArray<unknown>) => ReadonlyArray<number> | null;
  /** 已映射 x/y 直接解释为屏幕位置 */
  projectMappedRoles: (values: ReadonlyArray<number>) => Position | null;
  /** 笛卡尔 role-space containment 边界度量 */
  placementBoundary: NonNullable<CoordinateFrame['placementBoundary']>;
  /** 正交 cell → 轴对齐矩形（闭式快路）：position = 两区间中点、width/height = 区间跨度 */
  projectCell: (cell: Cell) => CellGeometry;
};

/**
 * 建二维笛卡尔运行时坐标帧。
 * @description primary 是 x 角色位置 scale，secondary 是 y 角色位置 scale；返回的 frame 同时提供点投影与 rect cell 快路。
 *   这是 lowering 内部的运行时对象，不进入 JSON IR，也不从根入口暴露给用户作为构造公共坐标系的主路径
 */
export const createCartesianCoordinate = (
  primary: PositionScale,
  secondary: PositionScale,
): CartesianCoordinateFrame => {
  const mapRoles = (values: ReadonlyArray<unknown>): ReadonlyArray<number> | null => {
    const x = primary.coordinate(values[0]);
    const y = secondary.coordinate(values[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  };
  const projectMappedRoles = (values: ReadonlyArray<number>): Position | null => {
    const x = values[0];
    const y = values[1];
    return Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
  };
  const project = (primaryValue: unknown, secondaryValue: unknown): Position | null => {
    const mapped = mapRoles([primaryValue, secondaryValue]);
    return mapped === null ? null : projectMappedRoles(mapped);
  };
  return {
    type: PlotCoordinate.Cartesian2D,
    roles: ['x', 'y'],
    primary,
    secondary,
    roleScales: { x: primary, y: secondary },
    project,
    projectRoles: values => project(values[0], values[1]),
    mapRoles,
    projectMappedRoles,
    placementBoundary: {
      isCyclic: () => false,
      unitNormal: role => (role === 'x' ? [1, 0] : role === 'y' ? [0, 1] : null),
      glyphExtentInRoleUnits: (role, _mappedRoles, screenExtent) =>
        role === 'x' || role === 'y' ? screenExtent : null,
    },
    projectCell: cell => {
      const [px0, px1] = cellInterval(cell, 'x');
      const [sy0, sy1] = cellInterval(cell, 'y');
      return {
        kind: 'rect',
        position: [(px0 + px1) / 2, (sy0 + sy1) / 2],
        width: Math.abs(px1 - px0),
        height: Math.abs(sy1 - sy0),
      };
    },
  };
};

/**
 * 一维笛卡尔运行时坐标帧。
 * @description 用单一位置 scale 沿 horizontal/vertical 方向投影，另一屏幕维度固定在 baseline。
 *   适用于单轴图形或 1D 坐标语法解析后的 lowering；它仍然产出二维屏幕坐标
 */
export type Cartesian1DCoordinateFrame = {
  /** 判别字段：1D 笛卡尔直线 */
  type: typeof PlotCoordinate.Cartesian1D;
  /** 位置角色序（[x]，单通道） */
  roles: ReadonlyArray<DimensionRole>;
  /** 轴向（horizontal 沿 x、vertical 沿 y） */
  orientation: Cartesian1DOrientationType;
  /** 塌缩维固定基线（horizontal=底边屏幕 y、vertical=左边屏幕 x） */
  baseline: number;
  /** 单一位置 scale */
  primary: PositionScale;
  /** 按通用 coordinate contract 暴露 x role 的位置 scale */
  roleScales: Partial<Record<DimensionRole, PositionScale>>;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([primaryValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：roles 长度 1，传 [value] → horizontal [scale(v), baseline] / vertical [baseline, scale(v)]；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /** 原始 x 经 position scale 映射 */
  mapRoles: (values: ReadonlyArray<unknown>) => ReadonlyArray<number> | null;
  /** 已映射 x 投影到 horizontal / vertical 屏幕轴 */
  projectMappedRoles: (values: ReadonlyArray<number>) => Position | null;
  /** 一维笛卡尔 role-space containment 边界度量 */
  placementBoundary: NonNullable<CoordinateFrame['placementBoundary']>;
};

/**
 * 建一维笛卡尔运行时坐标帧。
 * @description 单 scale 沿 orientation 指定的轴投影，另一屏幕维度固定在 baseline。
 *   1D 坐标没有面积 cell 语义，因此不提供 projectCell，interval / reference band 等 cell 类 mark 会 fail-loud
 */
export const createCartesian1DCoordinate = (
  scale: PositionScale,
  orientation: Cartesian1DOrientationType,
  baseline: number,
): Cartesian1DCoordinateFrame => {
  const mapRoles = (values: ReadonlyArray<unknown>): ReadonlyArray<number> | null => {
    const position = scale.coordinate(values[0]);
    return Number.isFinite(position) ? [position] : null;
  };
  const projectMappedRoles = (values: ReadonlyArray<number>): Position | null => {
    const position = values[0];
    if (!Number.isFinite(position)) return null;
    return orientation === Cartesian1DOrientation.Horizontal ? [position, baseline] : [baseline, position];
  };
  const projectRoles = (values: ReadonlyArray<unknown>): Position | null => {
    const mapped = mapRoles(values);
    return mapped === null ? null : projectMappedRoles(mapped);
  };
  return {
    type: PlotCoordinate.Cartesian1D,
    roles: ['x'],
    orientation,
    baseline,
    primary: scale,
    roleScales: { x: scale },
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
    mapRoles,
    projectMappedRoles,
    placementBoundary: {
      isCyclic: () => false,
      unitNormal: role => (role !== 'x' ? null : orientation === Cartesian1DOrientation.Horizontal ? [1, 0] : [0, 1]),
      glyphExtentInRoleUnits: (role, _mappedRoles, screenExtent) => (role === 'x' ? screenExtent : null),
    },
  };
};

const cartesian2DCoordinateDefinition: CoordinateDefinition<Cartesian2DCoordinate> = {
  schema: Cartesian2DSchema,
  roles: ['x', 'y'],
  resolve: (coordinate, ctx) => {
    const xValues = ctx.collectPositionValues('x', { axis: 'primary' });
    const yValues = ctx.collectPositionValues('y', { axis: 'secondary', includeBaseline: true });
    const xScaleDef = ctx.resolveScaleForRole('x', coordinate.x, xValues);
    const yScaleDef = ctx.resolveScaleForRole('y', coordinate.y, yValues);
    ctx.assertBaselineScaleCompatible(yScaleDef.type, ctx.marks);

    const xScale = ctx.buildPositionScale(xScaleDef, xValues, [0, ctx.width]);
    const yScale = ctx.buildPositionScale(yScaleDef, yValues, [ctx.height, 0]);

    assertUniqueAxisPlacement(ctx.axisGuides);
    const xAxis = ctx.axisGuides.find(guide => guide.dimension === 'x');
    const yAxis = ctx.axisGuides.find(guide => guide.dimension === 'y');
    const xTicks: TickSet | undefined = xAxis
      ? (ctx.collectAxisTicks('x') ?? ctx.resolveGuideTicks(xScale, xAxis.ticks, xAxis.tickLabels || undefined))
      : undefined;
    const yTicks: TickSet | undefined = yAxis
      ? (ctx.collectAxisTicks('y') ?? ctx.resolveGuideTicks(yScale, yAxis.ticks, yAxis.tickLabels || undefined))
      : undefined;
    const layoutXTicks = xAxis
      ? ctx.resolveVisibleGuideTicks(xTicks ?? EMPTY_TICKS, xAxis.ticks, value => xScale.coordinate(value))
      : undefined;
    const layoutYTicks = yAxis
      ? ctx.resolveVisibleGuideTicks(yTicks ?? EMPTY_TICKS, yAxis.ticks, value => yScale.coordinate(value))
      : undefined;

    let plotArea: Rect = { x: 0, y: 0, width: ctx.width, height: ctx.height };
    let lowered: Array<LoweredGuide> = [];
    let guideReserve: Margins = { top: 0, right: 0, bottom: 0, left: 0 };
    for (let pass = 0; pass < MAX_GUIDE_LAYOUT_PASSES; pass += 1) {
      const computed = computePlotArea(
        ctx.width,
        ctx.height,
        {
          hasXAxis: !!xAxis,
          hasYAxis: !!yAxis,
          xLabels: layoutXTicks?.labels ?? [],
          yLabels: layoutYTicks?.labels ?? [],
          legendReserve: ctx.legendReserve,
        },
        {
          fontSize: ctx.fontSize,
          reserve: addMarginReserve(ctx.layoutReserve, guideReserve),
          margin: ctx.margin,
        },
      );
      plotArea = ctx.plotAreaOverride ?? computed.plotArea;

      if (!hasExplicitContinuousRange(xScaleDef)) xScale.setRange([plotArea.x, plotArea.x + plotArea.width]);
      if (!hasExplicitContinuousRange(yScaleDef)) yScale.setRange([plotArea.y + plotArea.height, plotArea.y]);
      const xRangeOverride = ctx.roleRangeOverrides?.x;
      const yRangeOverride = ctx.roleRangeOverrides?.y;
      if (xRangeOverride !== undefined) xScale.setRange([xRangeOverride[0], xRangeOverride[1]]);
      if (yRangeOverride !== undefined) yScale.setRange([yRangeOverride[0], yRangeOverride[1]]);

      const visibleXTicks = xAxis
        ? ctx.resolveVisibleGuideTicks(xTicks ?? EMPTY_TICKS, xAxis.ticks, value => xScale.coordinate(value))
        : undefined;
      const visibleYTicks = yAxis
        ? ctx.resolveVisibleGuideTicks(yTicks ?? EMPTY_TICKS, yAxis.ticks, value => yScale.coordinate(value))
        : undefined;
      const [xRangeStart, xRangeEnd] = xScale.range();
      const [yRangeStart, yRangeEnd] = yScale.range();
      const guideFrame: Rect = {
        x: Math.min(xRangeStart, xRangeEnd),
        y: Math.min(yRangeStart, yRangeEnd),
        width: Math.abs(xRangeEnd - xRangeStart),
        height: Math.abs(yRangeEnd - yRangeStart),
      };
      const guideContext: GuideContext = {
        plotArea: guideFrame,
        projectX: xScale,
        projectY: yScale,
        xTicks: visibleXTicks ?? EMPTY_TICKS,
        yTicks: visibleYTicks ?? EMPTY_TICKS,
        fontSize: ctx.fontSize,
        labelGap: ctx.labelGap,
      };
      lowered = ctx.axisGuides.map(guide => ctx.lowerGuide(guide, guideContext, ctx.provenance));
      if (ctx.plotAreaOverride !== undefined) break;
      const tickLabelsByGuide = ctx.axisGuides.map(guide =>
        guide.placement?.kind === AxisPlacementKind.Origin
          ? new Set<string>()
          : new Set(guide.dimension === 'x' ? visibleXTicks?.labels : visibleYTicks?.labels),
      );
      const overflow = guideOverflowOf(lowered, tickLabelsByGuide, ctx.width, ctx.height, ctx.fontSize);
      if (Object.values(overflow).every(value => value <= 1e-6)) break;
      guideReserve = addMarginReserve(guideReserve, overflow);
    }
    const frame = createCartesianCoordinate(xScale, yScale);
    return {
      frame,
      plotArea,
      gridLayers: lowered.flatMap(layer => (layer.gridLayer ? [layer.gridLayer] : [])),
      axisLayers: lowered.flatMap(layer => (layer.axisLayer ? [layer.axisLayer] : [])),
    };
  },
};

const cartesian1DCoordinateDefinition: CoordinateDefinition<IRPlotCartesian1DCoordinate> = {
  schema: Cartesian1DSchema,
  roles: ['x'],
  resolve: (coordinate, ctx) => {
    const orientation = coordinate.orientation ?? Cartesian1DOrientation.Horizontal;
    const horizontal = orientation === Cartesian1DOrientation.Horizontal;
    const values = ctx.collectPositionValues('x', { axis: 'primary' });
    const scaleDef = ctx.resolveScaleForRole('x', coordinate.x, values);

    assertUniqueAxisPlacement(ctx.axisGuides);
    const axis = ctx.axisGuides.find(guide => guide.dimension === 'x');

    const provisional: [number, number] = horizontal ? [0, ctx.width] : [ctx.height, 0];
    const scale = ctx.buildPositionScale(scaleDef, values, provisional);
    const ticks: TickSet | undefined = axis
      ? (ctx.collectAxisTicks('x') ?? ctx.resolveGuideTicks(scale, axis.ticks, axis.tickLabels || undefined))
      : undefined;
    const layoutTicks = axis
      ? ctx.resolveVisibleGuideTicks(ticks ?? EMPTY_TICKS, axis.ticks, value => scale.coordinate(value))
      : undefined;
    const computed = computePlotArea(
      ctx.width,
      ctx.height,
      {
        hasXAxis: horizontal ? !!axis : false,
        hasYAxis: horizontal ? false : !!axis,
        xLabels: horizontal ? (layoutTicks?.labels ?? []) : [],
        yLabels: horizontal ? [] : (layoutTicks?.labels ?? []),
        legendReserve: ctx.legendReserve,
      },
      { fontSize: ctx.fontSize, reserve: ctx.layoutReserve, margin: ctx.margin },
    );
    const plotArea = ctx.plotAreaOverride ?? computed.plotArea;
    if (horizontal) scale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    else scale.setRange([plotArea.y + plotArea.height, plotArea.y]);
    const rangeOverride = ctx.roleRangeOverrides?.x;
    if (rangeOverride !== undefined) scale.setRange([rangeOverride[0], rangeOverride[1]]);
    const baseline = horizontal ? plotArea.y + plotArea.height : plotArea.x;
    const frame = createCartesian1DCoordinate(scale, orientation, baseline);
    const visibleTicks = axis
      ? ctx.resolveVisibleGuideTicks(ticks ?? EMPTY_TICKS, axis.ticks, value => scale.coordinate(value))
      : undefined;

    const guideContext: GuideContext = {
      plotArea,
      projectX: scale,
      projectY: scale,
      xTicks: horizontal ? (visibleTicks ?? EMPTY_TICKS) : EMPTY_TICKS,
      yTicks: horizontal ? EMPTY_TICKS : (visibleTicks ?? EMPTY_TICKS),
      fontSize: ctx.fontSize,
      labelGap: ctx.labelGap,
      axisOrientation: horizontal ? 'horizontal' : 'vertical',
    };
    const lowered = ctx.axisGuides.map(guide => ctx.lowerGuide(guide, guideContext, ctx.provenance));
    return {
      frame,
      plotArea,
      gridLayers: [],
      axisLayers: lowered.flatMap(layer => (layer.axisLayer ? [layer.axisLayer] : [])),
    };
  },
};

/** 笛卡尔内置坐标系 definitions */
export const CARTESIAN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  cartesian2DCoordinateDefinition,
  cartesian1DCoordinateDefinition,
] as ReadonlyArray<AnyCoordinateDefinition>;
