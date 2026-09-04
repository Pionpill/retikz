import type { IRStep } from '@retikz/core';
import type { Position } from '@retikz/math';

import { DEFAULT_EPSILON, isFiniteNumber, pointAtArcAngle } from '@retikz/math';

import type {
  AnyCoordinateDefinition,
  CoordinateDefinition,
  CoordinateFrame,
  DimensionRole,
  GuideContext,
  PolarCoordinateFrame,
  PositionScale,
  TickSet,
} from '../../../contract';
import type { IRPlotCoordinate, IRPlotPolar1DCoordinate, PolarInterpolationValue } from '../../../schemas';

import { cellInterval, PositionScaleContinuity, RETIKZ_POLAR_SEGMENT_SAMPLES } from '../../../contract';
import { PlotCoordinate, PlotScale, Polar1DSchema, Polar2DSchema, PolarInterpolation } from '../../../schemas';
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
 * @description 角度约定由 `@retikz/math` 的 pointAtArcAngle 统一维护；plot 侧只保留坐标帧的 nullable 契约，
 *   让 mark lowering 可以跳过非有限输入点
 */
const polarPoint = (center: Position, angleDeg: number, radius: number): Position | null =>
  isFiniteNumber(angleDeg) && isFiniteNumber(radius) ? pointAtArcAngle(center, radius, angleDeg) : null;

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
  /** 固定半径边界与插值敏感 mark 共用的已解析连接空间 */
  interpolation: PolarInterpolationValue;
  /** 固定半径 chord 边界使用的有序角向结构骨架，单位为度 */
  angularSkeleton: ReadonlyArray<number>;
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
  const mapRoles = (values: ReadonlyArray<unknown>): ReadonlyArray<number> | null => {
    const theta = input.primary.coordinate(values[0]);
    const radius = input.secondary.coordinate(values[1]);
    return Number.isFinite(theta) && Number.isFinite(radius) ? [theta, radius] : null;
  };
  const projectMappedRoles = (values: ReadonlyArray<number>): Position | null => {
    const [thetaDeg, radius] = values;
    if (input.interpolation === PolarInterpolation.Chord && input.primary.step > 0) {
      return projectPolarChord(input, thetaDeg, radius) ?? projectPolar(thetaDeg, radius);
    }
    return projectPolar(thetaDeg, radius);
  };
  const project = (angleValue: unknown, radiusValue: unknown): Position | null => {
    const mapped = mapRoles([angleValue, radiusValue]);
    return mapped === null ? null : projectMappedRoles(mapped);
  };
  return {
    type: PlotCoordinate.Polar2D,
    roles: ['x', 'y'],
    center: input.center,
    innerRadius: input.innerRadius,
    outerRadius: input.outerRadius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    interpolation: input.interpolation,
    angularSkeleton: input.angularSkeleton,
    primary: input.primary,
    secondary: input.secondary,
    roleScales: { x: input.primary, y: input.secondary },
    project,
    projectRoles: values => project(values[0], values[1]),
    mapRoles,
    projectMappedRoles,
    placementBoundary: {
      isCyclic: role => role === 'x' && isClosedPolarSweep(input.startAngle, input.endAngle),
      unitNormal: (role, mappedRoles) => {
        const theta = mappedRoles[0];
        if (!Number.isFinite(theta)) return null;
        if (input.interpolation === PolarInterpolation.Chord && input.primary.step > 0) {
          const segment = polarChordSegmentOf(input, theta);
          if (segment !== null) {
            if (role === 'x') return polarChordTangent(input, segment);
            if (role === 'y') return polarChordOutwardNormal(input, segment);
            return null;
          }
        }
        const radians = (theta * Math.PI) / 180;
        if (role === 'x') return [-Math.sin(radians), Math.cos(radians)];
        if (role === 'y') return [Math.cos(radians), Math.sin(radians)];
        return null;
      },
      glyphExtentInRoleUnits: (role, mappedRoles, screenExtent) => {
        if (input.interpolation === PolarInterpolation.Chord && input.primary.step > 0) {
          const chordExtent = polarChordGlyphExtentInRoleUnits(input, role, mappedRoles, screenExtent);
          if (chordExtent !== null) return chordExtent;
        }
        if (role === 'y') return screenExtent;
        if (role !== 'x') return null;
        const radius = Math.abs(mappedRoles[1]);
        if (!Number.isFinite(radius) || radius <= screenExtent) return null;
        return (Math.asin(screenExtent / radius) * 180) / Math.PI;
      },
    },
    projectPolar,
    projectCell: (cell, options) => {
      const [startAngle, endAngle] = cellInterval(cell, 'x');
      const [innerRadius, outerRadius] = cellInterval(cell, 'y');
      const pull = options?.pull ?? 0;
      const center = pull === 0 ? input.center : pointAtArcAngle(input.center, pull, (startAngle + endAngle) / 2);
      const interpolation = options?.interpolation ?? input.interpolation;
      if (interpolation === PolarInterpolation.Polar) {
        return { kind: 'sector', center, innerRadius, outerRadius, startAngle, endAngle };
      }
      const fullSweep = isClosedPolarSweep(startAngle, endAngle);
      const angles = fullSweep ? input.angularSkeleton : [startAngle, endAngle];
      if ((fullSweep && angles.length < 3) || (!fullSweep && angles.length < 2)) {
        return { kind: 'contour', points: [] };
      }
      const collapsedInnerBoundary = Math.abs(innerRadius) <= DEFAULT_EPSILON;
      const innerPoints = collapsedInnerBoundary
        ? fullSweep
          ? []
          : [center]
        : angles.map(angle => polarPoint(center, angle, innerRadius));
      const points = [
        ...innerPoints,
        ...[...angles].reverse().map(angle => polarPoint(center, angle, outerRadius)),
      ].filter((point): point is Position => point !== null);
      return { kind: 'contour', points };
    },
  };
};

const samePolarDirection = (left: number, right: number): boolean => {
  const leftRadians = (left * Math.PI) / 180;
  const rightRadians = (right * Math.PI) / 180;
  return (
    Math.abs(Math.cos(leftRadians) - Math.cos(rightRadians)) <= DEFAULT_EPSILON &&
    Math.abs(Math.sin(leftRadians) - Math.sin(rightRadians)) <= DEFAULT_EPSILON
  );
};

/** 非零角向 sweep 的起止方向是否重合 */
export const isClosedPolarSweep = (startAngle: number, endAngle: number): boolean =>
  Math.abs(endAngle - startAngle) > DEFAULT_EPSILON && samePolarDirection(startAngle, endAngle);

type PolarChordSegment = {
  startAngle: number;
  endAngle: number;
  ratio: number;
};

/** 在 angular skeleton 中定位合成角度所属的直弦段 */
const polarChordSegmentOf = (input: PolarCoordinateInput, thetaDeg: number): PolarChordSegment | null => {
  if (!Number.isFinite(thetaDeg) || input.angularSkeleton.length < 2) return null;
  const sweep = input.endAngle - input.startAngle;
  if (Math.abs(sweep) <= DEFAULT_EPSILON) return null;
  const direction = Math.sign(sweep);
  const sweepSpan = Math.abs(sweep);
  const skeleton = input.angularSkeleton
    .map(angle => ({ angle, distance: direction * (angle - input.startAngle) }))
    .sort((left, right) => left.distance - right.distance);
  let targetDistance = direction * (thetaDeg - input.startAngle);
  if (isClosedPolarSweep(input.startAngle, input.endAngle)) {
    targetDistance = ((targetDistance % sweepSpan) + sweepSpan) % sweepSpan;
    const extended = [
      {
        angle: skeleton[skeleton.length - 1].angle - sweep,
        distance: skeleton[skeleton.length - 1].distance - sweepSpan,
      },
      ...skeleton,
      { angle: skeleton[0].angle + sweep, distance: skeleton[0].distance + sweepSpan },
    ];
    for (let index = 0; index < extended.length - 1; index += 1) {
      const start = extended[index];
      const end = extended[index + 1];
      if (targetDistance < start.distance - DEFAULT_EPSILON || targetDistance > end.distance + DEFAULT_EPSILON) {
        continue;
      }
      const span = end.distance - start.distance;
      if (span <= DEFAULT_EPSILON) return null;
      return { startAngle: start.angle, endAngle: end.angle, ratio: (targetDistance - start.distance) / span };
    }
    return null;
  }
  const first = skeleton[0];
  const last = skeleton[skeleton.length - 1];
  const startIndex =
    targetDistance <= first.distance
      ? 0
      : targetDistance >= last.distance
        ? skeleton.length - 2
        : skeleton.findIndex(
            (entry, index) => index < skeleton.length - 1 && targetDistance <= skeleton[index + 1].distance,
          );
  if (startIndex < 0) return null;
  const start = skeleton[startIndex];
  const end = skeleton[startIndex + 1];
  const span = end.distance - start.distance;
  if (span <= DEFAULT_EPSILON) return null;
  return { startAngle: start.angle, endAngle: end.angle, ratio: (targetDistance - start.distance) / span };
};

/** 归一化二维向量；退化向量返回 null */
const normalizedVector = (vector: readonly [number, number]): readonly [number, number] | null => {
  const length = Math.hypot(vector[0], vector[1]);
  return length <= DEFAULT_EPSILON ? null : [vector[0] / length, vector[1] / length];
};

/** 直弦段沿数值角度增加方向的屏幕单位切向 */
const polarChordTangent = (
  input: PolarCoordinateInput,
  segment: PolarChordSegment,
): readonly [number, number] | null => {
  const start = polarPoint(input.center, segment.startAngle, 1);
  const end = polarPoint(input.center, segment.endAngle, 1);
  if (start === null || end === null) return null;
  const numericDirection = Math.sign(segment.endAngle - segment.startAngle);
  return normalizedVector([(end[0] - start[0]) * numericDirection, (end[1] - start[1]) * numericDirection]);
};

/** 直弦段背离圆心的屏幕单位法向 */
const polarChordOutwardNormal = (
  input: PolarCoordinateInput,
  segment: PolarChordSegment,
): readonly [number, number] | null => {
  const start = polarPoint(input.center, segment.startAngle, 1);
  const end = polarPoint(input.center, segment.endAngle, 1);
  if (start === null || end === null) return null;
  const edge = [end[0] - start[0], end[1] - start[1]] as const;
  const candidate = normalizedVector([edge[1], -edge[0]]);
  if (candidate === null) return null;
  const midpoint = [(start[0] + end[0]) / 2 - input.center[0], (start[1] + end[1]) / 2 - input.center[1]] as const;
  const orientation = midpoint[0] * candidate[0] + midpoint[1] * candidate[1] >= 0 ? 1 : -1;
  return [candidate[0] * orientation, candidate[1] * orientation];
};

/** 取得角度顶点两侧可能参与 containment 的直弦段 */
const polarChordSegmentsAround = (input: PolarCoordinateInput, thetaDeg: number): ReadonlyArray<PolarChordSegment> => {
  const sampleOffset = Math.max(DEFAULT_EPSILON * 10, Math.abs(input.endAngle - input.startAngle) * 1e-9);
  const segments: Array<PolarChordSegment> = [];
  for (const sampleAngle of [thetaDeg, thetaDeg - sampleOffset, thetaDeg + sampleOffset]) {
    const segment = polarChordSegmentOf(input, sampleAngle);
    if (
      segment !== null &&
      !segments.some(
        existing =>
          Math.abs(existing.startAngle - segment.startAngle) <= DEFAULT_EPSILON &&
          Math.abs(existing.endAngle - segment.endAngle) <= DEFAULT_EPSILON,
      )
    ) {
      segments.push(segment);
    }
  }
  return segments;
};

/** 把 Point 的屏幕法向 extent 保守换算为离散 chord role 单位 */
const polarChordGlyphExtentInRoleUnits = (
  input: PolarCoordinateInput,
  role: DimensionRole,
  mappedRoles: ReadonlyArray<number>,
  screenExtent: number,
): number | null => {
  const [thetaDeg, radius] = mappedRoles;
  if (!Number.isFinite(thetaDeg) || !Number.isFinite(radius)) return null;
  const segments = polarChordSegmentsAround(input, thetaDeg);
  if (segments.length === 0) return null;
  const roleExtents = segments.flatMap(segment => {
    const start = polarPoint(input.center, segment.startAngle, role === 'x' ? radius : 1);
    const end = polarPoint(input.center, segment.endAngle, role === 'x' ? radius : 1);
    if (start === null || end === null) return [];
    if (role === 'x') {
      const chordLength = Math.hypot(end[0] - start[0], end[1] - start[1]);
      const angleSpan = Math.abs(segment.endAngle - segment.startAngle);
      return chordLength <= DEFAULT_EPSILON || angleSpan <= DEFAULT_EPSILON
        ? []
        : [(screenExtent * angleSpan) / chordLength];
    }
    if (role === 'y') {
      const outwardNormal = polarChordOutwardNormal(input, segment);
      if (outwardNormal === null) return [];
      const radialVector = [start[0] - input.center[0], start[1] - input.center[1]] as const;
      const screenUnitsPerRoleUnit = Math.abs(radialVector[0] * outwardNormal[0] + radialVector[1] * outwardNormal[1]);
      return screenUnitsPerRoleUnit <= DEFAULT_EPSILON ? [] : [screenExtent / screenUnitsPerRoleUnit];
    }
    return [];
  });
  return roleExtents.length === 0 ? null : Math.max(...roleExtents);
};

/** 离散 chord 模式把类别间合成角度投影到相邻结构顶点的屏幕直线 */
const projectPolarChord = (input: PolarCoordinateInput, thetaDeg: number, radius: number): Position | null => {
  const segment = polarChordSegmentOf(input, thetaDeg);
  if (segment === null) return null;
  const start = polarPoint(input.center, segment.startAngle, radius);
  const end = polarPoint(input.center, segment.endAngle, radius);
  if (start === null || end === null) return null;
  return [start[0] + (end[0] - start[0]) * segment.ratio, start[1] + (end[1] - start[1]) * segment.ratio];
};

/**
 * 固定半径 Polar 边界下沉为 Core path steps
 * @description polar 使用精确 arc；chord 按 frame 的有序结构骨架连接，完整 sweep 在至少三个方向时闭合
 */
export const polarFixedRadiusSteps = (
  frame: PolarCoordinateFrame,
  radius: number,
  interpolation: PolarInterpolationValue = frame.interpolation,
  angleSpan: readonly [number, number] = [frame.startAngle, frame.endAngle],
): Array<IRStep> | null => {
  const [startAngle, endAngle] = angleSpan;
  if (interpolation === PolarInterpolation.Polar) {
    if (isClosedPolarSweep(startAngle, endAngle)) {
      return [
        { type: 'step', kind: 'move', to: frame.center },
        { type: 'step', kind: 'circlePath', radius },
      ];
    }
    const start = frame.projectPolar(startAngle, radius);
    if (start === null) return null;
    return [
      { type: 'step', kind: 'move', to: start },
      {
        type: 'step',
        kind: 'arc',
        startAngle,
        endAngle,
        radius,
        center: frame.center,
      },
    ];
  }
  const closed = isClosedPolarSweep(startAngle, endAngle);
  const angles = frame.angularSkeleton.filter(angle =>
    endAngle >= startAngle
      ? angle >= startAngle - DEFAULT_EPSILON && angle <= endAngle + DEFAULT_EPSILON
      : angle <= startAngle + DEFAULT_EPSILON && angle >= endAngle - DEFAULT_EPSILON,
  );
  if ((closed && angles.length < 3) || (!closed && angles.length < 2)) return null;
  const points = angles
    .map(angle => frame.projectPolar(angle, radius))
    .filter((point): point is Position => point !== null);
  if ((closed && points.length < 3) || (!closed && points.length < 2)) return null;
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: points[0] },
    ...points.slice(1).map((point): IRStep => ({ type: 'step', kind: 'line', to: point })),
  ];
  if (closed) steps.push({ type: 'step', kind: 'cycle' });
  return steps;
};

const angularSkeleton = (scale: PositionScale, ticks: TickSet): Array<number> => {
  const angles: Array<number> = [];
  for (const value of ticks.values) {
    const angle = scale.coordinate(value);
    if (!isFiniteNumber(angle) || angles.some(existing => samePolarDirection(existing, angle))) continue;
    angles.push(angle);
  }
  return angles;
};

/** 将可见角向刻度投影为极坐标布局需要的角度与文本 */
const polarAngularLayoutLabelsOf = (
  scale: PositionScale,
  ticks: TickSet | undefined,
): Array<{ angle: number; text: string }> =>
  ticks?.values.map((value, index) => ({ angle: scale.coordinate(value), text: ticks.labels[index] ?? '' })) ?? [];

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
  /** 原始 angle 值经 position scale 映射 */
  mapRoles: (values: ReadonlyArray<unknown>) => ReadonlyArray<number> | null;
  /** 已映射 angle 投影到固定半径圆周 */
  projectMappedRoles: (values: ReadonlyArray<number>) => Position | null;
  /** 一维极坐标 role-space containment 边界度量 */
  placementBoundary: NonNullable<CoordinateFrame['placementBoundary']>;
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
  const mapRoles = (values: ReadonlyArray<unknown>): ReadonlyArray<number> | null => {
    const theta = input.primary.coordinate(values[0]);
    return Number.isFinite(theta) ? [theta] : null;
  };
  const projectMappedRoles = (values: ReadonlyArray<number>): Position | null => projectPolar(values[0], input.radius);
  const projectRoles = (values: ReadonlyArray<unknown>): Position | null => {
    const mapped = mapRoles(values);
    return mapped === null ? null : projectMappedRoles(mapped);
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
    mapRoles,
    projectMappedRoles,
    placementBoundary: {
      isCyclic: role => role === 'x' && isClosedPolarSweep(input.startAngle, input.endAngle),
      unitNormal: (role, mappedRoles) => {
        if (role !== 'x') return null;
        const radians = (mappedRoles[0] * Math.PI) / 180;
        return [-Math.sin(radians), Math.cos(radians)];
      },
      glyphExtentInRoleUnits: (role, _mappedRoles, screenExtent) => {
        if (role !== 'x' || input.radius <= screenExtent) return null;
        return (Math.asin(screenExtent / input.radius) * 180) / Math.PI;
      },
    },
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
  options?: { closed?: boolean },
): Array<Position> => {
  if (vertices.length < 2) {
    return vertices.map(v => frame.projectPolar(v.theta, v.radius)).filter((p): p is Position => p !== null);
  }
  const sampledVertices = [...vertices];
  if (options?.closed) {
    const first = vertices[0];
    const last = vertices[vertices.length - 1];
    let closureTheta = first.theta;
    if (isClosedPolarSweep(frame.startAngle, frame.endAngle)) {
      if (frame.endAngle > frame.startAngle) {
        while (closureTheta <= last.theta + DEFAULT_EPSILON) closureTheta += 360;
      } else {
        while (closureTheta >= last.theta - DEFAULT_EPSILON) closureTheta -= 360;
      }
    }
    sampledVertices.push({ theta: closureTheta, radius: first.radius });
  }
  const points: Array<Position> = [];
  const first = frame.projectPolar(sampledVertices[0].theta, sampledVertices[0].radius);
  if (first) points.push(first);
  for (let i = 1; i < sampledVertices.length; i += 1) {
    const a = sampledVertices[i - 1];
    const b = sampledVertices[i];
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
  scaleBinding: {
    read: coordinate => ({ x: coordinate.angle, y: coordinate.radius }),
    bind: (coordinate, scaleNames) => ({
      ...coordinate,
      ...(scaleNames.x === undefined ? {} : { angle: scaleNames.x }),
      ...(scaleNames.y === undefined ? {} : { radius: scaleNames.y }),
    }),
  },
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
        angularLabels:
          angularAxis && angularAxis.tickLabels !== false
            ? polarAngularLayoutLabelsOf(angleScale, layoutAngularTicks)
            : [],
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
      interpolation:
        coordinate.interpolation ??
        (ctx.resolvePositionScaleContinuity(angleScaleDef) === PositionScaleContinuity.Continuous
          ? PolarInterpolation.Polar
          : PolarInterpolation.Chord),
      angularSkeleton: angularSkeleton(angleScale, angularTicks ?? angleScale.ticks()),
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
  scaleBinding: {
    read: coordinate => ({ x: coordinate.angle }),
    bind: (coordinate, scaleNames) => ({
      ...coordinate,
      ...(scaleNames.x === undefined ? {} : { angle: scaleNames.x }),
    }),
  },
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
        angularLabels:
          angularAxis && angularAxis.tickLabels !== false
            ? polarAngularLayoutLabelsOf(angleScale, visibleAngularTicks)
            : [],
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
      interpolation: continuousAngle ? PolarInterpolation.Polar : PolarInterpolation.Chord,
      angularSkeleton: angularSkeleton(angleScale, angularTicks ?? angleScale.ticks()),
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
