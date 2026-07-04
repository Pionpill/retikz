import type { Position } from '@retikz/math';

import { isFiniteNumber } from '@retikz/math';

import type {
  AnyCoordinateDefinition,
  Cell,
  CellGeometry,
  CoordinateDefinition,
  DimensionRole,
  GuideContext,
  TernaryVertices,
  TickSet,
} from '../../../contract';
import type { Ternary2DCoordinate } from '../../../schemas';

import { cellInterval } from '../../../contract';
import { PlotCoordinate, PlotScale, Ternary2DSchema } from '../../../schemas';
import { computeTernaryFrame } from '../../../shared';
import { assertUniqueAxisPlacement } from '../shared';

/** 空刻度集：三角 guide 的 x/y 位置 scale 占位不会被实际读取。 */
const EMPTY_TICKS: TickSet = { values: [], labels: [] };

/** 三角轴共享刻度集（占比 0..1，标签为百分数）。 */
const TERNARY_TICKS: TickSet = { values: [0, 0.25, 0.5, 0.75, 1], labels: ['0', '25', '50', '75', '100'] };

/** 三元坐标的重心分量 [x, y, z]，三个分量按 coordinate roles 顺序相加为 1。 */
type BarycentricPoint = [number, number, number];

/** 三元 cell 裁剪的浮点容差，用于边界包含判断和近似平行边处理。 */
const TERNARY_EPSILON = 1e-9;

/** 把区间端点整理为升序，便于后续裁剪统一处理反向区间。 */
const sortedInterval = (interval: [number, number]): [number, number] =>
  interval[0] <= interval[1] ? interval : [interval[1], interval[0]];

/** 在 barycentric 多边形边上求与某个分量边界的交点。 */
const interpolateBarycentric = (
  a: BarycentricPoint,
  b: BarycentricPoint,
  roleIndex: number,
  boundary: number,
): BarycentricPoint => {
  const delta = b[roleIndex] - a[roleIndex];
  if (Math.abs(delta) < TERNARY_EPSILON) return a;
  const t = (boundary - a[roleIndex]) / delta;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
};

/** 用半平面裁剪 barycentric 多边形，保留满足当前分量边界的一侧。 */
const clipBarycentricPolygon = (
  polygon: Array<BarycentricPoint>,
  roleIndex: number,
  boundary: number,
  keep: (value: number, boundary: number) => boolean,
): Array<BarycentricPoint> => {
  if (polygon.length === 0) return [];
  const clipped: Array<BarycentricPoint> = [];
  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const previous = polygon[(i + polygon.length - 1) % polygon.length];
    const currentInside = keep(current[roleIndex], boundary);
    const previousInside = keep(previous[roleIndex], boundary);
    if (currentInside !== previousInside) clipped.push(interpolateBarycentric(previous, current, roleIndex, boundary));
    if (currentInside) clipped.push(current);
  }
  return clipped;
};

/** 把分量区间归一到 simplex 的合法 [0, 1] 范围内。 */
const clampUnitInterval = (interval: [number, number]): [number, number] => {
  const [lo, hi] = sortedInterval(interval);
  return [Math.max(0, lo), Math.min(1, hi)];
};

/**
 * 三元 cell 裁剪：把 x/y/z 三个分量区间裁到标准 simplex，再映射到屏幕顶点空间。
 * @description 这是三元坐标专属的 barycentric clipping；通用 cell 模块只保存 cell 数据结构。
 */
const ternaryCellContour = (cell: Cell, vertices: TernaryVertices): Array<Position> => {
  const intervals = [
    clampUnitInterval(cellInterval(cell, 'x')),
    clampUnitInterval(cellInterval(cell, 'y')),
    clampUnitInterval(cellInterval(cell, 'z')),
  ];
  if (intervals.some(([lo, hi]) => lo > hi)) return [];
  let polygon: Array<BarycentricPoint> = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let roleIndex = 0; roleIndex < intervals.length; roleIndex += 1) {
    const [lo, hi] = intervals[roleIndex];
    polygon = clipBarycentricPolygon(polygon, roleIndex, lo, (value, boundary) => value >= boundary - TERNARY_EPSILON);
    polygon = clipBarycentricPolygon(polygon, roleIndex, hi, (value, boundary) => value <= boundary + TERNARY_EPSILON);
  }
  const [vx, vy, vz] = vertices;
  return polygon.map(([x, y, z]) => [x * vx[0] + y * vy[0] + z * vz[0], x * vx[1] + y * vy[1] + z * vz[1]]);
};

/** 三元运行时坐标帧：三连续分量 x/y/z 归一化后按重心坐标投影到三角形内。 */
export type Ternary2DCoordinateFrame = {
  /** 判别字段：2D 三元 */
  type: typeof PlotCoordinate.Ternary2D;
  /** 位置角色序（[x, y, z]，3 通道） */
  roles: ReadonlyArray<DimensionRole>;
  /** 三角顶点（屏幕坐标）：[Vx, Vy, Vz] */
  vertices: TernaryVertices;
  /** 投影别名（2 入参形态对三元无意义，恒返回 null）：三元须走 projectRoles */
  project: (primaryValue: unknown, secondaryValue: unknown) => Position | null;
  /** N 通道投影：roles 长度 3，传 [x, y, z] → 归一化 + 重心坐标屏幕点；非有限 → null（跳过）、含负 / 和≤0 → throw（fail-loud） */
  projectRoles: (values: ReadonlyArray<unknown>) => Position | null;
  /** 三轴 cell → 三元 simplex 裁剪后的 contour */
  projectCell: (cell: Cell) => CellGeometry;
};

/**
 * 建三元帧：重心投影 + 自动归一化（容忍任意正三元组）
 * @description 每行 (x,y,z) 先归一化 s=x+y+z、(x/s,y/s,z/s)，再 nx·Vx + ny·Vy + nz·Vz 得屏幕点。
 *   非有限值（缺字段 / NaN）→ null 跳过该点（与其它坐标系一致）；含负分量 / 和≤0 → fail-loud（数据错误、不静默归一）。
 *   projectCell 使用 simplex clipping 把三个分量区间投影为 contour；退化为空的 contour 会由 cell 几何层统一跳过。
 */
export const createTernary2DCoordinate = (vertices: TernaryVertices): Ternary2DCoordinateFrame => {
  const [vx, vy, vz] = vertices;
  const projectRoles = (values: ReadonlyArray<unknown>): Position | null => {
    const x = values[0];
    const y = values[1];
    const z = values[2];
    if (!isFiniteNumber(x) || !isFiniteNumber(y) || !isFiniteNumber(z)) return null;
    if (x < 0 || y < 0 || z < 0) {
      throw new Error(`lowerPlots: ternary coordinate requires non-negative components (got x=${x}, y=${y}, z=${z})`);
    }
    const sum = x + y + z;
    if (sum <= 0) {
      throw new Error(`lowerPlots: ternary coordinate requires x+y+z > 0 (got x=${x}, y=${y}, z=${z})`);
    }
    // 各分量有限但和上溢 Infinity（分量数量级过大）→ 归一化系数塌成 0、点静默落原点；fail-loud 不静默出怪图
    if (!Number.isFinite(sum)) {
      throw new Error(
        `lowerPlots: ternary coordinate components overflow when summed (got x=${x}, y=${y}, z=${z}); use proportions or smaller magnitudes`,
      );
    }
    const nx = x / sum;
    const ny = y / sum;
    const nz = z / sum;
    return [nx * vx[0] + ny * vy[0] + nz * vz[0], nx * vx[1] + ny * vy[1] + nz * vz[1]];
  };
  return {
    type: PlotCoordinate.Ternary2D,
    roles: ['x', 'y', 'z'],
    vertices,
    project: () => null,
    projectRoles,
    projectCell: cell => ({ kind: 'contour', points: ternaryCellContour(cell, vertices) }),
  };
};

const ternary2DCoordinateDefinition: CoordinateDefinition<Ternary2DCoordinate> = {
  schema: Ternary2DSchema,
  roles: ['x', 'y', 'z'],
  resolve: (coordinate, ctx) => {
    if (ctx.axisGuides.some(guide => guide.placement?.kind === 'side')) {
      throw new Error('lowerPlots: ternary2D axis does not support cardinal side placement; use auto or edge');
    }
    if (
      ctx.axisGuides.some(
        guide =>
          guide.ticks?.count !== undefined ||
          guide.ticks?.values !== undefined ||
          guide.ticks?.interval !== undefined ||
          guide.ticks?.density !== undefined,
      )
    ) {
      throw new Error('lowerPlots: ternary2D axis does not support custom tick source or density');
    }
    assertUniqueAxisPlacement(ctx.axisGuides);
    const hasAxis = ctx.axisGuides.length > 0;
    const showAnyLabels = ctx.axisGuides.some(guide => guide.tickLabels !== false);
    const layout = computeTernaryFrame(
      ctx.width,
      ctx.height,
      { hasAxis, labels: hasAxis && showAnyLabels ? TERNARY_TICKS.labels : [] },
      { fontSize: ctx.fontSize, reserve: ctx.layoutReserve, margin: ctx.margin },
    );
    const frame = createTernary2DCoordinate(layout.vertices);
    const placeholderScale = ctx.buildPositionScale(
      { type: PlotScale.Linear, name: '__ternary', domain: [0, 1] },
      [],
      [0, 1],
    );
    const guideContext: GuideContext = {
      plotArea: { x: 0, y: 0, width: ctx.width, height: ctx.height },
      projectX: placeholderScale,
      projectY: placeholderScale,
      xTicks: EMPTY_TICKS,
      yTicks: EMPTY_TICKS,
      fontSize: ctx.fontSize,
      labelGap: ctx.labelGap,
      ternaryVertices: layout.vertices,
      ternaryTicks: TERNARY_TICKS,
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

/** 三元内置坐标系 definitions。 */
export const TERNARY_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  ternary2DCoordinateDefinition,
] as ReadonlyArray<AnyCoordinateDefinition>;
