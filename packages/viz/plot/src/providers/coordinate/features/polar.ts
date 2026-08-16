import type { Position } from '@retikz/math';

import { arcEndPoint, isFiniteNumber } from '@retikz/math';

import type {
  AnyCoordinateDefinition,
  CoordinateDefinition,
  DimensionRole,
  GuideContext,
  PolarCoordinateFrame,
  PositionScale,
  TickSet,
} from '../../../contract';
import type { IRPlotCoordinate, IRPlotPolar1DCoordinate } from '../../../schemas';

import { cellInterval, RETIKZ_POLAR_SEGMENT_SAMPLES } from '../../../contract';
import { PlotCoordinate, PlotScale, Polar1DSchema, Polar2DSchema } from '../../../schemas';
import { computePolarCoordinate } from '../../../shared';
import { assertUniqueAxisPlacement } from '../shared';

type Polar2DCoordinate = Extract<IRPlotCoordinate, { type: typeof PlotCoordinate.Polar2D }>;

/** 空刻度集：某维度无 axis 时给 GuideContext 的占位 */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/** guide 维度 → 极坐标定位角色 */
const axisRole = (dimension: string): string => {
  if (dimension === 'x') return 'angular';
  if (dimension === 'y') return 'radial';
  return dimension;
};

/** 连续角轴需要段内采样弯弧；分类角轴类别间无中间值，走弦 */
const isContinuousAngleScale = (scaleType: string): boolean =>
  scaleType === PlotScale.Linear ||
  scaleType === PlotScale.Time ||
  scaleType === PlotScale.Log ||
  scaleType === PlotScale.Pow ||
  scaleType === PlotScale.Sqrt ||
  scaleType === PlotScale.Symlog ||
  scaleType === PlotScale.Radial;

/**
 * 极坐标输出空间点 → 屏幕点。
 * @description 角度约定由 `@retikz/math` 的 arcEndPoint 统一维护；plot 侧只保留坐标帧的 nullable 契约，
 *   让 mark lowering 可以跳过非有限输入点
 */
const polarPoint = (center: Position, angleDeg: number, radius: number): Position | null =>
  isFiniteNumber(angleDeg) && isFiniteNumber(radius) ? arcEndPoint(center, radius, angleDeg) : null;

/** 创建二维极坐标运行时坐标帧所需的已解析参数 */
export type PolarCoordinateInput = {
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 内半径（user units） */
  innerRadius: number;
  /** 外半径（user units） */
  outerRadius: number;
  /** 角向起始角（度） */
  startAngle: number;
  /** 角向终止角（度） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；决定连续 mark 是否段内采样 */
  continuousAngle: boolean;
  /** angle 位置 scale */
  primary: PositionScale;
  /** radius 位置 scale */
  secondary: PositionScale;
};

/**
 * 建二维极坐标运行时坐标帧。
 * @description θ=primary.coordinate(angleValue)（度）、r=secondary.coordinate(radiusValue)；
 *   返回 [cx + r·cos(θ°), cy + r·sin(θ°)]，屏幕 y 向下、0°=+x、90°=+y（与 core polar 约定一致）。
 *   frame 同时提供 projectCell，将 x/y 输出区间闭式投影为 sector，供 interval / reference band 使用
 */
export const createPolarCoordinate = (input: PolarCoordinateInput): PolarCoordinateFrame => {
  const projectPolar = (thetaDeg: number, radius: number): Position | null =>
    polarPoint(input.center, thetaDeg, radius);
  const project = (angleValue: unknown, radiusValue: unknown): Position | null => {
    const theta = input.primary.coordinate(angleValue);
    const radius = input.secondary.coordinate(radiusValue);
    return projectPolar(theta, radius);
  };
  return {
    type: PlotCoordinate.Polar2D,
    roles: ['x', 'y'],
    center: input.center,
    innerRadius: input.innerRadius,
    outerRadius: input.outerRadius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    secondary: input.secondary,
    roleScales: { x: input.primary, y: input.secondary },
    project,
    projectRoles: values => project(values[0], values[1]),
    projectPolar,
    projectCell: cell => ({
      kind: 'sector',
      center: input.center,
      innerRadius: cellInterval(cell, 'y')[0],
      outerRadius: cellInterval(cell, 'y')[1],
      startAngle: cellInterval(cell, 'x')[0],
      endAngle: cellInterval(cell, 'x')[1],
    }),
  };
};

/**
 * 一维极坐标运行时坐标帧。
 * @description 用单一角向 scale 把 x 角色投影到固定半径的圆周上；它不提供 cell 几何投影能力
 */
export type Polar1DCoordinateFrame = {
  /** 判别字段：1D 极坐标圆周 */
  type: typeof PlotCoordinate.Polar1D;
  /** 位置角色序（[angle]，单通道；x→angle 别名取值） */
  roles: ReadonlyArray<DimensionRole>;
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 固定圆周半径（user units，= radius 占比 × outerRadius） */
  radius: number;
  /** 角向起始角（度，角向 range 起） */
  startAngle: number;
  /** 角向终止角（度，角向 range 止） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；连续才在段内插值采样 */
  continuousAngle: boolean;
  /** angle 位置 scale（range = [startAngle, endAngle] 度） */
  primary: PositionScale;
  /** 按通用 coordinate contract 暴露 x role 的位置 scale */
  roleScales: Partial<Record<DimensionRole, PositionScale>>;
  /** 把已映射的极坐标对 (θ 度, r user units) 换算成屏幕点（非有限 → null） */
  projectPolar: (thetaDeg: number, radius: number) => Position | null;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([angleValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：roles 长度 1，传 [angleValue] → projectPolar(angleScale(angleValue), radius)；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
};

/** 创建一维极坐标运行时坐标帧所需的已解析参数 */
export type Polar1DCoordinateInput = {
  /** 圆心（屏幕坐标） */
  center: Position;
  /** 固定圆周半径（user units） */
  radius: number;
  /** 角向起始角（度） */
  startAngle: number;
  /** 角向终止角（度） */
  endAngle: number;
  /** 角向 scale 是否连续 */
  continuousAngle: boolean;
  /** angle 位置 scale */
  primary: PositionScale;
};

/**
 * 建一维极坐标运行时坐标帧。
 * @description 单一 x 角色被解释为角向值，并投影到固定 radius 的圆周上。该 frame 只表达点/路径位置，
 *   不提供 projectCell；需要面积 cell 时必须使用 polar2D 或自定义带 projectCell 的 frame
 */
export const createPolar1DCoordinate = (input: Polar1DCoordinateInput): Polar1DCoordinateFrame => {
  const projectPolar = (thetaDeg: number, radius: number): Position | null =>
    polarPoint(input.center, thetaDeg, radius);
  const projectRoles = (values: ReadonlyArray<unknown>): Position | null => {
    const theta = input.primary.coordinate(values[0]);
    return projectPolar(theta, input.radius);
  };
  return {
    type: PlotCoordinate.Polar1D,
    roles: ['x'],
    center: input.center,
    radius: input.radius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    roleScales: { x: input.primary },
    projectPolar,
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
  };
};

/** 一行数据在极坐标 scale 输出空间中的顶点：θ（度）+ r（user units） */
export type PolarVertex = { theta: number; radius: number };

/**
 * 把一行的角向 / 径向原始值映射成 PolarVertex。
 * @description PolarVertex 保留的是 scale 输出空间的 θ（度）和 r（user units），还不是屏幕点；
 *   path 会先收集顶点，再决定是否按连续角轴 densify 成弧线。非有限值返回 null
 */
export const toPolarVertex = (
  frame: PolarCoordinateFrame,
  angleValue: unknown,
  radiusValue: unknown,
): PolarVertex | null => {
  const theta = frame.primary.coordinate(angleValue);
  const radius = frame.secondary.coordinate(radiusValue);
  if (!isFiniteNumber(theta) || !isFiniteNumber(radius)) return null;
  return { theta, radius };
};

/**
 * 连续角轴段内采样：在 [θ, r] scale 输出空间线性插值，逐点反投影成屏幕弧点
 * @description 相邻顶点间插 RETIKZ_POLAR_SEGMENT_SAMPLES 个中间点（在度 + 半径空间线性，非原始数据空间），
 *   使数据空间「常半径变角」的直边在屏幕弯成弧。顶点数 < 2 时直接返回各顶点投影点（不采样）。
 *   调用方只应在 frame.continuousAngle 为 true 时使用；分类角轴的相邻类别应保持弦连接
 */
export const densifyPolarSegments = (
  frame: PolarCoordinateFrame,
  vertices: ReadonlyArray<PolarVertex>,
): Array<Position> => {
  if (vertices.length < 2) {
    return vertices.map(v => frame.projectPolar(v.theta, v.radius)).filter((p): p is Position => p !== null);
  }
  const points: Array<Position> = [];
  const first = frame.projectPolar(vertices[0].theta, vertices[0].radius);
  if (first) points.push(first);
  for (let i = 1; i < vertices.length; i += 1) {
    const a = vertices[i - 1];
    const b = vertices[i];
    // 段内中间点 + 段终点：t 从 1/(N+1) 走到 1（含终点）
    for (let step = 1; step <= RETIKZ_POLAR_SEGMENT_SAMPLES + 1; step += 1) {
      const t = step / (RETIKZ_POLAR_SEGMENT_SAMPLES + 1);
      const theta = a.theta + (b.theta - a.theta) * t;
      const radius = a.radius + (b.radius - a.radius) * t;
      const point = frame.projectPolar(theta, radius);
      if (point) points.push(point);
    }
  }
  return points;
};

const polar2DCoordinateDefinition: CoordinateDefinition<Polar2DCoordinate> = {
  schema: Polar2DSchema,
  roles: ['x', 'y'],
  resolve: (coordinate, ctx) => {
    const angleValues = ctx.collectPositionValues('x', { axis: 'primary' });
    const radiusValues = ctx.collectPositionValues('y', { axis: 'secondary', includeBaseline: true });
    const angleScaleDef = ctx.resolveScaleForRole('x', coordinate.angle, angleValues);
    const radiusScaleDef = ctx.resolveScaleForRole('y', coordinate.radius, radiusValues);
    ctx.assertBaselineScaleCompatible(radiusScaleDef.type, ctx.marks);

    assertUniqueAxisPlacement(ctx.axisGuides, axisRole);
    const angularAxis = ctx.axisGuides.find(guide => guide.dimension === 'x');
    const radialAxis = ctx.axisGuides.find(guide => guide.dimension === 'y');

    const angleScale = ctx.buildPositionScale(angleScaleDef, angleValues, [coordinate.startAngle, coordinate.endAngle]);
    const angleRangeOverride = ctx.roleRangeOverrides?.x;
    if (angleRangeOverride !== undefined) angleScale.setRange([angleRangeOverride[0], angleRangeOverride[1]]);
    const angularTicks: TickSet | undefined = angularAxis
      ? (ctx.collectAxisTicks('x') ??
        ctx.resolveGuideTicks(angleScale, angularAxis.ticks, angularAxis.tickLabels || undefined))
      : undefined;
    const layoutAngularTicks = angularAxis
      ? ctx.resolveVisibleGuideTicks(angularTicks ?? EMPTY_TICKS, angularAxis.ticks, value =>
          angleScale.coordinate(value),
        )
      : undefined;
    const layout = computePolarCoordinate(
      ctx.width,
      ctx.height,
      {
        hasAngularAxis: !!(angularAxis && angularAxis.tickLabels !== false),
        angularLabels: layoutAngularTicks?.labels ?? [],
      },
      { fontSize: ctx.fontSize, reserve: ctx.layoutReserve, margin: ctx.margin },
    );
    const innerRadiusUnits = coordinate.innerRadius * layout.outerRadius;
    const radiusScale = ctx.buildPositionScale(radiusScaleDef, radiusValues, [innerRadiusUnits, layout.outerRadius]);
    const radiusRangeOverride = ctx.roleRangeOverrides?.y;
    if (radiusRangeOverride !== undefined) radiusScale.setRange([radiusRangeOverride[0], radiusRangeOverride[1]]);
    const radialTicks: TickSet | undefined = radialAxis
      ? (ctx.collectAxisTicks('y') ??
        ctx.resolveGuideTicks(radiusScale, radialAxis.ticks, radialAxis.tickLabels || undefined))
      : undefined;
    const visibleAngularTicks = angularAxis
      ? ctx.resolveVisibleGuideTicks(angularTicks ?? EMPTY_TICKS, angularAxis.ticks, value =>
          angleScale.coordinate(value),
        )
      : undefined;
    const visibleRadialTicks = radialAxis
      ? ctx.resolveVisibleGuideTicks(radialTicks ?? EMPTY_TICKS, radialAxis.ticks, value =>
          radiusScale.coordinate(value),
        )
      : undefined;
    const [radiusRangeStart, radiusRangeEnd] = radiusScale.range();
    const frameInnerRadius = Math.min(radiusRangeStart, radiusRangeEnd);
    const frameOuterRadius = Math.max(radiusRangeStart, radiusRangeEnd);
    const frame = createPolarCoordinate({
      center: layout.center,
      innerRadius: frameInnerRadius,
      outerRadius: frameOuterRadius,
      startAngle: coordinate.startAngle,
      endAngle: coordinate.endAngle,
      continuousAngle: isContinuousAngleScale(angleScaleDef.type),
      primary: angleScale,
      secondary: radiusScale,
    });

    const guideContext: GuideContext = {
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      projectX: angleScale,
      projectY: radiusScale,
      xTicks: visibleAngularTicks ?? EMPTY_TICKS,
      yTicks: visibleRadialTicks ?? EMPTY_TICKS,
      fontSize: ctx.fontSize,
      labelGap: ctx.labelGap,
      frame,
      angularTicks: visibleAngularTicks ?? EMPTY_TICKS,
      radialTicks: visibleRadialTicks ?? EMPTY_TICKS,
    };
    const lowered = ctx.axisGuides.map(guide => ctx.lowerGuide(guide, guideContext, ctx.provenance));
    return {
      frame,
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      gridLayers: lowered.flatMap(layer => (layer.gridLayer ? [layer.gridLayer] : [])),
      axisLayers: lowered.flatMap(layer => (layer.axisLayer ? [layer.axisLayer] : [])),
    };
  },
};

const polar1DCoordinateDefinition: CoordinateDefinition<IRPlotPolar1DCoordinate> = {
  schema: Polar1DSchema,
  roles: ['x'],
  resolve: (coordinate, ctx) => {
    const radiusFraction = coordinate.radius ?? 1;
    const startAngle = coordinate.startAngle ?? 0;
    const endAngle = coordinate.endAngle ?? 360;
    const angleValues = ctx.collectPositionValues('x', { axis: 'primary' });
    const angleScaleDef = ctx.resolveScaleForRole('x', coordinate.angle, angleValues);

    assertUniqueAxisPlacement(ctx.axisGuides, axisRole);
    const angularAxis = ctx.axisGuides.find(guide => guide.dimension === 'x');

    const angleScale = ctx.buildPositionScale(angleScaleDef, angleValues, [startAngle, endAngle]);
    const angleRangeOverride = ctx.roleRangeOverrides?.x;
    if (angleRangeOverride !== undefined) angleScale.setRange([angleRangeOverride[0], angleRangeOverride[1]]);
    const angularTicks: TickSet | undefined = angularAxis
      ? (ctx.collectAxisTicks('x') ??
        ctx.resolveGuideTicks(angleScale, angularAxis.ticks, angularAxis.tickLabels || undefined))
      : undefined;
    const visibleAngularTicks = angularAxis
      ? ctx.resolveVisibleGuideTicks(angularTicks ?? EMPTY_TICKS, angularAxis.ticks, value =>
          angleScale.coordinate(value),
        )
      : undefined;
    const layout = computePolarCoordinate(
      ctx.width,
      ctx.height,
      {
        hasAngularAxis: !!(angularAxis && angularAxis.tickLabels !== false),
        angularLabels: visibleAngularTicks?.labels ?? [],
      },
      { fontSize: ctx.fontSize, reserve: ctx.layoutReserve, margin: ctx.margin },
    );
    const radius = radiusFraction * layout.outerRadius;
    const continuousAngle = isContinuousAngleScale(angleScaleDef.type);
    const frame = createPolar1DCoordinate({
      center: layout.center,
      radius,
      startAngle,
      endAngle,
      continuousAngle,
      primary: angleScale,
    });

    const guidePolarCoordinate = createPolarCoordinate({
      center: layout.center,
      innerRadius: 0,
      outerRadius: radius,
      startAngle,
      endAngle,
      continuousAngle,
      primary: angleScale,
      secondary: angleScale,
    });
    const guideContext: GuideContext = {
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      projectX: angleScale,
      projectY: angleScale,
      xTicks: visibleAngularTicks ?? EMPTY_TICKS,
      yTicks: EMPTY_TICKS,
      fontSize: ctx.fontSize,
      labelGap: ctx.labelGap,
      frame: guidePolarCoordinate,
      angularTicks: visibleAngularTicks ?? EMPTY_TICKS,
      radialTicks: EMPTY_TICKS,
    };
    const lowered = ctx.axisGuides.map(guide => ctx.lowerGuide(guide, guideContext, ctx.provenance));
    return {
      frame,
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      gridLayers: [],
      axisLayers: lowered.flatMap(layer => (layer.axisLayer ? [layer.axisLayer] : [])),
    };
  },
};

/** 极坐标内置坐标系 definitions */
export const POLAR_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  polar2DCoordinateDefinition,
  polar1DCoordinateDefinition,
] as ReadonlyArray<AnyCoordinateDefinition>;
