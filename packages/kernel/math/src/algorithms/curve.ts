import type { Position, Vector2 } from '../primitives';

import { DEFAULT_EPSILON } from '../constants';
import { lerp, point, vector2 } from '../primitives';

const DEFAULT_CURVE_SAMPLE_COUNT = 32;
const DEFAULT_CURVE_BISECTION_STEPS = 32;

/** 直线曲线段 */
export type LineCurveSegment = {
  /** 曲线种类 */
  kind: 'line';
  /** 起点 */
  from: Position;
  /** 终点 */
  to: Position;
};

/** 二次贝塞尔曲线段 */
export type QuadraticBezierCurveSegment = {
  /** 曲线种类 */
  kind: 'quadraticBezier';
  /** 起点 */
  from: Position;
  /** 控制点 */
  control: Position;
  /** 终点 */
  to: Position;
};

/** 三次贝塞尔曲线段 */
export type CubicBezierCurveSegment = {
  /** 曲线种类 */
  kind: 'cubicBezier';
  /** 起点 */
  from: Position;
  /** 第一个控制点 */
  control1: Position;
  /** 第二个控制点 */
  control2: Position;
  /** 终点 */
  to: Position;
};

/** 一段三次贝塞尔：两控制点 + 终点（起点为上一段终点 / 首段为第一个 knot） */
export type CubicSegment = { control1: Position; control2: Position; to: Position };

/** 圆弧曲线段 */
export type CircularArcCurveSegment = {
  /** 曲线种类 */
  kind: 'arc';
  /** 圆心 */
  center: Position;
  /** 半径 */
  radius: number;
  /** 起始参数角，单位为度 */
  startAngleDeg: number;
  /** 结束参数角，单位为度 */
  endAngleDeg: number;
  /** 是否逆时针扫描；省略时由起止角方向决定 */
  counterClockwise?: boolean;
};

/** 椭圆弧曲线段 */
export type EllipseArcCurveSegment = {
  /** 曲线种类 */
  kind: 'ellipseArc';
  /** 椭圆中心 */
  center: Position;
  /** 本地 x 半轴 */
  radiusX: number;
  /** 本地 y 半轴 */
  radiusY: number;
  /** 本地椭圆相对世界坐标的旋转角，单位为度 */
  rotationDeg?: number;
  /** 起始参数角，单位为度 */
  startAngleDeg: number;
  /** 结束参数角，单位为度 */
  endAngleDeg: number;
  /** 是否逆时针扫描；省略时由起止角方向决定 */
  counterClockwise?: boolean;
};

/** 可参数化、可切片的零依赖曲线段 */
export type CurveSegment =
  | LineCurveSegment
  | QuadraticBezierCurveSegment
  | CubicBezierCurveSegment
  | CircularArcCurveSegment
  | EllipseArcCurveSegment;

/** 曲线参数采样结果 */
export type CurveSegmentSample = {
  /** 参数位置对应的点 */
  point: Position;
  /** 沿曲线前进方向的单位切线；零导数回退为 `[1, 0]` */
  tangent: Vector2;
};

/** 曲线长度近似配置 */
export type CurveApproximationOptions = {
  /** Bezier 与椭圆弧使用的等参数采样数量 */
  sampleCount?: number;
};

/** 曲线距离到参数反解配置 */
export type CurveParameterAtDistanceOptions = CurveApproximationOptions & {
  /** 已按同一采样预算计算的完整曲线长度，省略时即时计算 */
  totalLength?: number;
  /** 二分反解最多执行次数 */
  bisectionSteps?: number;
};

type CurveArcSegment = Extract<CurveSegment, { kind: 'arc' | 'ellipseArc' }>;

type CatmullRomSegmentControlsInput = {
  p0: Position;
  p1: Position;
  p2: Position;
  p3: Position;
  tension: number;
};

/**
 * 计算 centripetal Catmull-Rom 的相邻 knot 参数间距
 * @remarks 复杂度：时间 O(1)，空间 O(1)；重合 knot 回退到 epsilon，避免后续切线计算除零
 */
const centripetalKnotSpacing = (a: Position, b: Position): number => {
  const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const spacing = Math.sqrt(distance);
  return spacing < DEFAULT_EPSILON ? DEFAULT_EPSILON : spacing;
};

/**
 * 计算 P1→P2 段的 Catmull-Rom 三次贝塞尔控制点
 * @remarks 复杂度：时间 O(1)，空间 O(1)；tension 缩放切线长度，不改变段终点
 */
const catmullRomSegmentControls = (
  input: CatmullRomSegmentControlsInput,
): { control1: Position; control2: Position } => {
  const { p0, p1, p2, p3, tension } = input;
  const dt0 = centripetalKnotSpacing(p0, p1);
  const dt1 = centripetalKnotSpacing(p1, p2);
  const dt2 = centripetalKnotSpacing(p2, p3);
  const tangent = (a: number, b: number, c: number, d: number): { m1: number; m2: number } => {
    const m1 = (b - a) / dt0 - (c - a) / (dt0 + dt1) + (c - b) / dt1;
    const m2 = (c - b) / dt1 - (d - b) / (dt1 + dt2) + (d - c) / dt2;
    return { m1, m2 };
  };
  const tx = tangent(p0[0], p1[0], p2[0], p3[0]);
  const ty = tangent(p0[1], p1[1], p2[1], p3[1]);
  const k = (dt1 / 3) * tension;
  return {
    control1: [p1[0] + tx.m1 * k, p1[1] + ty.m1 * k],
    control2: [p2[0] - tx.m2 * k, p2[1] - ty.m2 * k],
  };
};

/**
 * centripetal Catmull-Rom（α=0.5）穿过 knots → 三次贝塞尔段链
 * @description 输入不足 2 个 knot 时返回空数组；每段终点严格命中下一个 knot
 * @remarks 复杂度：时间 O(n)，空间 O(n)，n 为 knot 数
 */
const catmullRomToCubic = (knots: Array<Position>, tension: number): Array<CubicSegment> => {
  const n = knots.length;
  if (n < 2) return [];

  const segments: Array<CubicSegment> = [];
  for (let i = 0; i < n - 1; i++) {
    const p1 = knots[i];
    const p2 = knots[i + 1];
    const p0 = i > 0 ? knots[i - 1] : p1;
    const p3 = i + 2 < n ? knots[i + 2] : p2;

    const { control1, control2 } = catmullRomSegmentControls({ p0, p1, p2, p3, tension });
    segments.push({ control1, control2, to: [p2[0], p2[1]] });
  }
  return segments;
};

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const copyPoint = (pointValue: Position): Position => [pointValue[0], pointValue[1]];

const normalizedSampleCount = (sampleCount: number | undefined): number =>
  Math.max(1, Math.floor(sampleCount ?? DEFAULT_CURVE_SAMPLE_COUNT));

const normalizedBisectionSteps = (bisectionSteps: number | undefined): number =>
  Math.max(1, Math.floor(bisectionSteps ?? DEFAULT_CURVE_BISECTION_STEPS));

const normalizedArcSweep = (segment: CurveArcSegment): { startAngleDeg: number; endAngleDeg: number } => {
  const { startAngleDeg, endAngleDeg } = segment;
  const counterClockwise = segment.counterClockwise ?? endAngleDeg < startAngleDeg;
  const sweep = endAngleDeg - startAngleDeg;
  if (sweep === 0) return { startAngleDeg, endAngleDeg: startAngleDeg };
  if (Math.abs(sweep) === 360) {
    return { startAngleDeg, endAngleDeg: startAngleDeg + (counterClockwise ? -360 : 360) };
  }
  const normalizedSweep = ((sweep % 360) + 360) % 360;
  const alignedSweep = counterClockwise
    ? normalizedSweep === 0
      ? -360
      : normalizedSweep - 360
    : normalizedSweep === 0
      ? 360
      : normalizedSweep;
  return { startAngleDeg, endAngleDeg: startAngleDeg + alignedSweep };
};

const sampleArcAt = (segment: CurveArcSegment, parameter: number): CurveSegmentSample => {
  const sweep = normalizedArcSweep(segment);
  const angleDeg = sweep.startAngleDeg + (sweep.endAngleDeg - sweep.startAngleDeg) * parameter;
  const angleRad = (angleDeg * Math.PI) / 180;
  const direction = sweep.endAngleDeg >= sweep.startAngleDeg ? 1 : -1;
  const radiusX = segment.kind === 'arc' ? segment.radius : segment.radiusX;
  const radiusY = segment.kind === 'arc' ? segment.radius : segment.radiusY;
  const rotationRad = segment.kind === 'ellipseArc' ? ((segment.rotationDeg ?? 0) * Math.PI) / 180 : 0;
  const localPoint: Position = [radiusX * Math.cos(angleRad), radiusY * Math.sin(angleRad)];
  const localTangent: Vector2 = [-radiusX * Math.sin(angleRad) * direction, radiusY * Math.cos(angleRad) * direction];
  return {
    point: [
      segment.center[0] + localPoint[0] * Math.cos(rotationRad) - localPoint[1] * Math.sin(rotationRad),
      segment.center[1] + localPoint[0] * Math.sin(rotationRad) + localPoint[1] * Math.cos(rotationRad),
    ],
    tangent: vector2.normalize([
      localTangent[0] * Math.cos(rotationRad) - localTangent[1] * Math.sin(rotationRad),
      localTangent[0] * Math.sin(rotationRad) + localTangent[1] * Math.cos(rotationRad),
    ]),
  };
};

const sampleCurveSegmentAt = (segment: CurveSegment, parameter: number): CurveSegmentSample => {
  const t = clampUnit(parameter);
  if (segment.kind === 'line') {
    return {
      point: [
        segment.from[0] + (segment.to[0] - segment.from[0]) * t,
        segment.from[1] + (segment.to[1] - segment.from[1]) * t,
      ],
      tangent: vector2.normalize([segment.to[0] - segment.from[0], segment.to[1] - segment.from[1]]),
    };
  }
  if (segment.kind === 'quadraticBezier') {
    const inverse = 1 - t;
    return {
      point: [
        inverse * inverse * segment.from[0] + 2 * inverse * t * segment.control[0] + t * t * segment.to[0],
        inverse * inverse * segment.from[1] + 2 * inverse * t * segment.control[1] + t * t * segment.to[1],
      ],
      tangent: vector2.normalize([
        2 * inverse * (segment.control[0] - segment.from[0]) + 2 * t * (segment.to[0] - segment.control[0]),
        2 * inverse * (segment.control[1] - segment.from[1]) + 2 * t * (segment.to[1] - segment.control[1]),
      ]),
    };
  }
  if (segment.kind === 'cubicBezier') {
    const inverse = 1 - t;
    return {
      point: [
        inverse ** 3 * segment.from[0] +
          3 * inverse * inverse * t * segment.control1[0] +
          3 * inverse * t * t * segment.control2[0] +
          t ** 3 * segment.to[0],
        inverse ** 3 * segment.from[1] +
          3 * inverse * inverse * t * segment.control1[1] +
          3 * inverse * t * t * segment.control2[1] +
          t ** 3 * segment.to[1],
      ],
      tangent: vector2.normalize([
        3 * inverse * inverse * (segment.control1[0] - segment.from[0]) +
          6 * inverse * t * (segment.control2[0] - segment.control1[0]) +
          3 * t * t * (segment.to[0] - segment.control2[0]),
        3 * inverse * inverse * (segment.control1[1] - segment.from[1]) +
          6 * inverse * t * (segment.control2[1] - segment.control1[1]) +
          3 * t * t * (segment.to[1] - segment.control2[1]),
      ]),
    };
  }
  return sampleArcAt(segment, t);
};

const approximateCurveLengthTo = (segment: CurveSegment, parameter: number, sampleCount: number): number => {
  const t = clampUnit(parameter);
  if (t <= DEFAULT_EPSILON) return 0;
  if (segment.kind === 'line') return point.distance(segment.from, segment.to) * t;
  if (segment.kind === 'arc') {
    const sweep = normalizedArcSweep(segment);
    return Math.abs(sweep.endAngleDeg - sweep.startAngleDeg) * (Math.PI / 180) * Math.abs(segment.radius) * t;
  }
  const samples = Math.max(4, Math.ceil(sampleCount * t));
  let length = 0;
  let previousPoint = sampleCurveSegmentAt(segment, 0).point;
  for (let index = 1; index <= samples; index += 1) {
    const currentPoint = sampleCurveSegmentAt(segment, (t * index) / samples).point;
    length += point.distance(previousPoint, currentPoint);
    previousPoint = currentPoint;
  }
  return length;
};

const splitQuadraticBezier = (
  segment: QuadraticBezierCurveSegment,
  parameter: number,
): { left: QuadraticBezierCurveSegment; right: QuadraticBezierCurveSegment } => {
  const fromControl = lerp(segment.from, segment.control, parameter);
  const controlTo = lerp(segment.control, segment.to, parameter);
  const middle = lerp(fromControl, controlTo, parameter);
  return {
    left: { kind: 'quadraticBezier', from: copyPoint(segment.from), control: fromControl, to: middle },
    right: { kind: 'quadraticBezier', from: middle, control: controlTo, to: copyPoint(segment.to) },
  };
};

const splitCubicBezier = (
  segment: CubicBezierCurveSegment,
  parameter: number,
): { left: CubicBezierCurveSegment; right: CubicBezierCurveSegment } => {
  const first = lerp(segment.from, segment.control1, parameter);
  const second = lerp(segment.control1, segment.control2, parameter);
  const third = lerp(segment.control2, segment.to, parameter);
  const fourth = lerp(first, second, parameter);
  const fifth = lerp(second, third, parameter);
  const middle = lerp(fourth, fifth, parameter);
  return {
    left: {
      kind: 'cubicBezier',
      from: copyPoint(segment.from),
      control1: first,
      control2: fourth,
      to: middle,
    },
    right: {
      kind: 'cubicBezier',
      from: middle,
      control1: fifth,
      control2: third,
      to: copyPoint(segment.to),
    },
  };
};

const sliceCurveSegment = (segment: CurveSegment, fromParameter: number, toParameter: number): CurveSegment => {
  const start = clampUnit(Math.min(fromParameter, toParameter));
  const end = clampUnit(Math.max(fromParameter, toParameter));
  if (segment.kind === 'line') {
    return {
      kind: 'line',
      from: sampleCurveSegmentAt(segment, start).point,
      to: sampleCurveSegmentAt(segment, end).point,
    };
  }
  if (segment.kind === 'quadraticBezier') {
    const untilEnd = end < 1 ? splitQuadraticBezier(segment, end).left : segment;
    const localStart = end > DEFAULT_EPSILON ? start / end : 0;
    const slice = start > DEFAULT_EPSILON ? splitQuadraticBezier(untilEnd, localStart).right : untilEnd;
    return {
      kind: 'quadraticBezier',
      from: copyPoint(slice.from),
      control: copyPoint(slice.control),
      to: copyPoint(slice.to),
    };
  }
  if (segment.kind === 'cubicBezier') {
    const untilEnd = end < 1 ? splitCubicBezier(segment, end).left : segment;
    const localStart = end > DEFAULT_EPSILON ? start / end : 0;
    const slice = start > DEFAULT_EPSILON ? splitCubicBezier(untilEnd, localStart).right : untilEnd;
    return {
      kind: 'cubicBezier',
      from: copyPoint(slice.from),
      control1: copyPoint(slice.control1),
      control2: copyPoint(slice.control2),
      to: copyPoint(slice.to),
    };
  }
  const sweep = normalizedArcSweep(segment);
  const startAngleDeg = sweep.startAngleDeg + (sweep.endAngleDeg - sweep.startAngleDeg) * start;
  const endAngleDeg = sweep.startAngleDeg + (sweep.endAngleDeg - sweep.startAngleDeg) * end;
  if (segment.kind === 'arc') {
    const sliced: CircularArcCurveSegment = {
      kind: 'arc',
      center: copyPoint(segment.center),
      radius: segment.radius,
      startAngleDeg,
      endAngleDeg,
    };
    if (segment.counterClockwise !== undefined) sliced.counterClockwise = segment.counterClockwise;
    return sliced;
  }
  const sliced: EllipseArcCurveSegment = {
    kind: 'ellipseArc',
    center: copyPoint(segment.center),
    radiusX: segment.radiusX,
    radiusY: segment.radiusY,
    startAngleDeg,
    endAngleDeg,
  };
  if (segment.rotationDeg !== undefined) sliced.rotationDeg = segment.rotationDeg;
  if (segment.counterClockwise !== undefined) sliced.counterClockwise = segment.counterClockwise;
  return sliced;
};

/** 可参数化曲线的纯几何运算 */
export const curve = {
  /** centripetal Catmull-Rom（α=0.5）穿过 knots → 三次贝塞尔段链 */
  catmullRomToCubic,
  /**
   * 在曲线参数位置采样点和行进方向切线
   * @description 参数会 clamp 到 `[0, 1]`；零导数回退为确定的 `[1, 0]` 切线
   * @remarks 复杂度：时间 O(1)，空间 O(1)
   */
  sampleAt: (segment: CurveSegment, parameter: number): CurveSegmentSample => sampleCurveSegmentAt(segment, parameter),
  /**
   * 用确定的等参数 polyline 近似曲线长度
   * @description line 与圆弧使用解析长度；Bezier 与椭圆弧按 `sampleCount` 采样
   * @remarks 复杂度：时间 O(n)，空间 O(1)，n 为有效采样数量
   */
  approximateLength: (segment: CurveSegment, options: CurveApproximationOptions = {}): number =>
    approximateCurveLengthTo(segment, 1, normalizedSampleCount(options.sampleCount)),
  /**
   * 将沿曲线的距离反解为参数位置
   * @description 使用与 `approximateLength` 相同的离散长度模型；传入 `totalLength` 时必须与相同 sample count 对应。当中点的近似长度与目标距离相差不超过默认几何容差时提前返回
   * @remarks 复杂度：最坏时间 O(b·n)，空间 O(1)，b 为最大二分次数，n 为有效采样数量
   */
  parameterAtDistance: (
    segment: CurveSegment,
    distance: number,
    options: CurveParameterAtDistanceOptions = {},
  ): number => {
    const sampleCount = normalizedSampleCount(options.sampleCount);
    const totalLength = options.totalLength ?? approximateCurveLengthTo(segment, 1, sampleCount);
    if (!Number.isFinite(totalLength) || totalLength <= DEFAULT_EPSILON) return 0;
    const clampedDistance = Math.max(0, Math.min(totalLength, distance));
    if (clampedDistance <= DEFAULT_EPSILON) return 0;
    if (totalLength - clampedDistance <= DEFAULT_EPSILON) return 1;
    if (segment.kind === 'line' || segment.kind === 'arc') return clampedDistance / totalLength;
    let lowerParameter = 0;
    let upperParameter = 1;
    for (let index = 0; index < normalizedBisectionSteps(options.bisectionSteps); index += 1) {
      const middleParameter = (lowerParameter + upperParameter) / 2;
      const middleLength = approximateCurveLengthTo(segment, middleParameter, sampleCount);
      if (Math.abs(middleLength - clampedDistance) <= DEFAULT_EPSILON) return middleParameter;
      if (middleLength < clampedDistance) {
        lowerParameter = middleParameter;
      } else {
        upperParameter = middleParameter;
      }
    }
    return (lowerParameter + upperParameter) / 2;
  },
  /**
   * 取曲线参数区间的保形子段
   * @description 参数先 clamp 并升序排列；Bezier 使用 De Casteljau，圆弧和椭圆弧保留有向角扫描
   * @remarks 复杂度：时间 O(1)，空间 O(1)
   */
  slice: (segment: CurveSegment, fromParameter: number, toParameter: number): CurveSegment =>
    sliceCurveSegment(segment, fromParameter, toParameter),
};
