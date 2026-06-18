import type { Position } from '@retikz/math';
import { type Cartesian1DCoordinate, Cartesian1DOrientation, type Cartesian1DOrientationType, type Coordinate, PlotCoordinate, PlotScale, type Scale } from '../ir';
import { Cartesian1DSchema, Cartesian2DSchema } from '../ir/coordinate';
import type { GuideContext } from '../guide';
import { type Rect, computePlotArea } from '../pipeline/layout';
import type { PositionScale, TickSet } from '../scale';
import { assertUniqueAxisDimension } from './axis';
import type { Cell, CellGeometry } from './cell';
import { cellInterval } from './cell';
import type { AnyCoordinateDefinition, CoordinateDefinition } from './define';
import type { DimensionRole } from './types';

type Cartesian2DCoordinate = Extract<Coordinate, { type: typeof PlotCoordinate.Cartesian2D }>;

/** 空刻度集：某维度无 axis 时给 GuideContext 的占位。 */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/** 仅连续数值 scale 的显式 range 会阻止坐标系把 range 收敛到 plotArea。 */
const hasExplicitContinuousRange = (def: Scale): boolean =>
  (def.type === PlotScale.Linear || def.type === PlotScale.Log || def.type === PlotScale.Pow || def.type === PlotScale.Sqrt) && def.range !== undefined;

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
  /** 投影：[primary.coordinate(x), secondary.coordinate(y)]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：按 roles 序传值（[x, y]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /** 正交 cell → 轴对齐矩形（闭式快路）：position = 两区间中点、width/height = 区间跨度 */
  projectCell: (cell: Cell) => CellGeometry;
};

/** 建二维笛卡尔运行时坐标帧：primary = x scale、secondary = y scale。 */
export const createCartesianCoordinate = (primary: PositionScale, secondary: PositionScale): CartesianCoordinateFrame => {
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
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([primaryValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：roles 长度 1，传 [value] → horizontal [scale(v), baseline] / vertical [baseline, scale(v)]；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
};

/** 建一维笛卡尔帧：单 scale + 轴向 + 塌缩维基线（horizontal → [scale(v), baseline]、vertical → [baseline, scale(v)]） */
export const createCartesian1DCoordinate = (scale: PositionScale, orientation: Cartesian1DOrientationType, baseline: number): Cartesian1DCoordinateFrame => {
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
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
  };
};

const cartesian2DCoordinateDefinition: CoordinateDefinition<Cartesian2DCoordinate> = {
  schema: Cartesian2DSchema,
  roles: ['x', 'y'],
  resolve: (coordinate, ctx) => {
    const xValues = ctx.collectPositionValues('x', { axis: 'primary', includeLinkSource: true, includeLinkTargets: true });
    const yValues = ctx.collectPositionValues('y', { axis: 'secondary', includeBaseline: true, includeLinkSource: true, includeLinkTargets: true });
    const xScaleDef = ctx.resolveScaleForRole('x', coordinate.x, xValues, { includeLinkSource: true });
    const yScaleDef = ctx.resolveScaleForRole('y', coordinate.y, yValues, { includeLinkSource: true });
    ctx.assertBaselineScaleCompatible(yScaleDef.type, ctx.marks);

    const xScale = ctx.buildPositionScale(xScaleDef, xValues, [0, ctx.width]);
    const yScale = ctx.buildPositionScale(yScaleDef, yValues, [ctx.height, 0]);

    assertUniqueAxisDimension(ctx.axisGuides);
    const xAxis = ctx.axisGuides.find(guide => guide.dimension === 'x');
    const yAxis = ctx.axisGuides.find(guide => guide.dimension === 'y');
    const xTicks: TickSet | undefined = xAxis ? xScale.ticks(xAxis.tickCount) : undefined;
    const yTicks: TickSet | undefined = yAxis ? yScale.ticks(yAxis.tickCount) : undefined;

    const computed = computePlotArea(
      ctx.width,
      ctx.height,
      { hasXAxis: !!xAxis, hasYAxis: !!yAxis, xLabels: xTicks?.labels ?? [], yLabels: yTicks?.labels ?? [], legendReserve: ctx.legendReserve },
      { fontSize: ctx.fontSize, margin: ctx.margin },
    );
    const plotArea = computed.plotArea;

    if (!hasExplicitContinuousRange(xScaleDef)) xScale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    if (!hasExplicitContinuousRange(yScaleDef)) yScale.setRange([plotArea.y + plotArea.height, plotArea.y]);
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
    const values = ctx.collectPositionValues('x', { axis: 'primary', includeLinkSource: true });
    const scaleDef = ctx.resolveScaleForRole('x', coordinate.x, values, { includeLinkSource: true });

    assertUniqueAxisDimension(ctx.axisGuides);
    const axis = ctx.axisGuides.find(guide => guide.dimension === 'x');

    const provisional: [number, number] = horizontal ? [0, ctx.width] : [ctx.height, 0];
    const scale = ctx.buildPositionScale(scaleDef, values, provisional);
    const ticks: TickSet | undefined = axis ? scale.ticks(axis.tickCount) : undefined;
    const computed = computePlotArea(
      ctx.width,
      ctx.height,
      {
        hasXAxis: horizontal ? !!axis : false,
        hasYAxis: horizontal ? false : !!axis,
        xLabels: horizontal ? ticks?.labels ?? [] : [],
        yLabels: horizontal ? [] : ticks?.labels ?? [],
        legendReserve: ctx.legendReserve,
      },
      { fontSize: ctx.fontSize, margin: ctx.margin },
    );
    const plotArea = computed.plotArea;
    if (horizontal) scale.setRange([plotArea.x, plotArea.x + plotArea.width]);
    else scale.setRange([plotArea.y + plotArea.height, plotArea.y]);
    const baseline = horizontal ? plotArea.y + plotArea.height : plotArea.x;
    const frame = createCartesian1DCoordinate(scale, orientation, baseline);

    const guideContext: GuideContext = {
      plotArea,
      projectX: scale,
      projectY: scale,
      xTicks: horizontal ? ticks ?? EMPTY_TICKS : EMPTY_TICKS,
      yTicks: horizontal ? EMPTY_TICKS : ticks ?? EMPTY_TICKS,
      fontSize: ctx.fontSize,
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
export const CARTESIAN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [cartesian2DCoordinateDefinition, cartesian1DCoordinateDefinition] as ReadonlyArray<AnyCoordinateDefinition>;
