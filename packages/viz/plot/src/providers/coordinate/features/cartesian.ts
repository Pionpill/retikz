import type { Position } from '@retikz/math';

import type {
  AnyCoordinateDefinition,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  DimensionRole,
  PositionScale,
  TickSet,
} from '../../../contract';
import type { GuideContext } from '../../../features';
import type { Rect } from '../../../pipeline/layout';
import type { Cartesian1DCoordinate, Cartesian1DOrientationType, Coordinate, ScaleOperation } from '../../../schemas';

import { cellInterval } from '../../../contract';
import { computePlotArea } from '../../../pipeline/layout';
import {
  Cartesian1DOrientation,
  Cartesian1DSchema,
  Cartesian2DSchema,
  PlotCoordinate,
  PlotScale,
} from '../../../schemas';
import { assertUniqueAxisPlacement } from '../shared';

type Cartesian2DCoordinate = Extract<Coordinate, { type: typeof PlotCoordinate.Cartesian2D }>;

/** 空刻度集：某维度无 axis 时给 GuideContext 的占位。 */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/** 仅连续数值 scale 的显式 range 会阻止坐标系把 range 收敛到 plotArea（自定义 type 无内置 range 语义、按可收敛处理）。 */
const hasExplicitContinuousRange = (def: ScaleOperation): boolean =>
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
 *   该类型描述可执行的投影能力，不等同于 `ir/coordinate` 中的 JSON schema 类型。
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
  /** 按通用 coordinate contract 暴露各 role 的位置 scale。 */
  roleScales: Partial<Record<DimensionRole, PositionScale>>;
  /** 投影：[primary.coordinate(x), secondary.coordinate(y)]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值（[x, y]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /** 正交 cell → 轴对齐矩形（闭式快路）：position = 两区间中点、width/height = 区间跨度 */
  projectCell: (cell: Cell) => CellGeometry;
};

/**
 * 建二维笛卡尔运行时坐标帧。
 * @description primary 是 x 角色位置 scale，secondary 是 y 角色位置 scale；返回的 frame 同时提供点投影与 rect cell 快路。
 *   这是 lowering 内部的运行时对象，不进入 JSON IR，也不从根入口暴露给用户作为构造公共坐标系的主路径。
 */
export const createCartesianCoordinate = (
  primary: PositionScale,
  secondary: PositionScale,
): CartesianCoordinateFrame => {
  const project = (primaryValue: unknown, secondaryValue: unknown): Position | null => {
    const x = primary.coordinate(primaryValue);
    const y = secondary.coordinate(secondaryValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  };
  return {
    type: PlotCoordinate.Cartesian2D,
    roles: ['x', 'y'],
    primary,
    secondary,
    roleScales: { x: primary, y: secondary },
    project,
    projectRoles: values => project(values[0], values[1]),
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
 *   适用于单轴图形或 1D 坐标语法解析后的 lowering；它仍然产出二维屏幕坐标。
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
  /** 按通用 coordinate contract 暴露 x role 的位置 scale。 */
  roleScales: Partial<Record<DimensionRole, PositionScale>>;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([primaryValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：roles 长度 1，传 [value] → horizontal [scale(v), baseline] / vertical [baseline, scale(v)]；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
};

/**
 * 建一维笛卡尔运行时坐标帧。
 * @description 单 scale 沿 orientation 指定的轴投影，另一屏幕维度固定在 baseline。
 *   1D 坐标没有面积 cell 语义，因此不提供 projectCell，interval / reference band 等 cell 类 mark 会 fail-loud。
 */
export const createCartesian1DCoordinate = (
  scale: PositionScale,
  orientation: Cartesian1DOrientationType,
  baseline: number,
): Cartesian1DCoordinateFrame => {
  const projectRoles = (values: ReadonlyArray<unknown>): Position | null => {
    const position = scale.coordinate(values[0]);
    if (!Number.isFinite(position)) return null;
    // horizontal：数据沿 x、塌缩 y=baseline（底边）；vertical：数据沿 y、塌缩 x=baseline（左边）
    return orientation === Cartesian1DOrientation.Horizontal ? [position, baseline] : [baseline, position];
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
      ? (ctx.collectAxisTicks('x') ?? xScale.ticks(xAxis.tickCount))
      : undefined;
    const yTicks: TickSet | undefined = yAxis
      ? (ctx.collectAxisTicks('y') ?? yScale.ticks(yAxis.tickCount))
      : undefined;

    const computed = computePlotArea(
      ctx.width,
      ctx.height,
      {
        hasXAxis: !!xAxis,
        hasYAxis: !!yAxis,
        xLabels: xTicks?.labels ?? [],
        yLabels: yTicks?.labels ?? [],
        legendReserve: ctx.legendReserve,
      },
      { fontSize: ctx.fontSize, margin: ctx.margin },
    );
    const plotArea = ctx.plotAreaOverride ?? computed.plotArea;

    if (!hasExplicitContinuousRange(xScaleDef)) xScale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    if (!hasExplicitContinuousRange(yScaleDef)) yScale.setRange([plotArea.y + plotArea.height, plotArea.y]);
    const xRangeOverride = ctx.roleRangeOverrides?.x;
    const yRangeOverride = ctx.roleRangeOverrides?.y;
    if (xRangeOverride !== undefined) xScale.setRange([xRangeOverride[0], xRangeOverride[1]]);
    if (yRangeOverride !== undefined) yScale.setRange([yRangeOverride[0], yRangeOverride[1]]);
    const frame = createCartesianCoordinate(xScale, yScale);

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
      xTicks: xTicks ?? EMPTY_TICKS,
      yTicks: yTicks ?? EMPTY_TICKS,
      fontSize: ctx.fontSize,
      labelGap: ctx.labelGap,
    };
    const lowered = ctx.axisGuides.map(guide => ctx.lowerGuide(guide, guideContext, ctx.provenance));
    return {
      frame,
      plotArea,
      gridLayers: lowered.flatMap(layer => (layer.gridLayer ? [layer.gridLayer] : [])),
      axisLayers: lowered.flatMap(layer => (layer.axisLayer ? [layer.axisLayer] : [])),
    };
  },
};

const cartesian1DCoordinateDefinition: CoordinateDefinition<Cartesian1DCoordinate> = {
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
    const ticks: TickSet | undefined = axis ? (ctx.collectAxisTicks('x') ?? scale.ticks(axis.tickCount)) : undefined;
    const computed = computePlotArea(
      ctx.width,
      ctx.height,
      {
        hasXAxis: horizontal ? !!axis : false,
        hasYAxis: horizontal ? false : !!axis,
        xLabels: horizontal ? (ticks?.labels ?? []) : [],
        yLabels: horizontal ? [] : (ticks?.labels ?? []),
        legendReserve: ctx.legendReserve,
      },
      { fontSize: ctx.fontSize, margin: ctx.margin },
    );
    const plotArea = ctx.plotAreaOverride ?? computed.plotArea;
    if (horizontal) scale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    else scale.setRange([plotArea.y + plotArea.height, plotArea.y]);
    const rangeOverride = ctx.roleRangeOverrides?.x;
    if (rangeOverride !== undefined) scale.setRange([rangeOverride[0], rangeOverride[1]]);
    const baseline = horizontal ? plotArea.y + plotArea.height : plotArea.x;
    const frame = createCartesian1DCoordinate(scale, orientation, baseline);

    const guideContext: GuideContext = {
      plotArea,
      projectX: scale,
      projectY: scale,
      xTicks: horizontal ? (ticks ?? EMPTY_TICKS) : EMPTY_TICKS,
      yTicks: horizontal ? EMPTY_TICKS : (ticks ?? EMPTY_TICKS),
      fontSize: ctx.fontSize,
      labelGap: ctx.labelGap,
      axisOrientation: horizontal ? 'horizontal' : 'vertical',
    };
    const lowered = ctx.axisGuides.map(guide => ctx.lowerGuide(guide, guideContext, ctx.provenance));
    return {
      frame,
      plotArea,
      gridLayers: lowered.flatMap(layer => (layer.gridLayer ? [layer.gridLayer] : [])),
      axisLayers: lowered.flatMap(layer => (layer.axisLayer ? [layer.axisLayer] : [])),
    };
  },
};

/** 笛卡尔内置坐标系 definitions。 */
export const CARTESIAN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  cartesian2DCoordinateDefinition,
  cartesian1DCoordinateDefinition,
] as ReadonlyArray<AnyCoordinateDefinition>;
