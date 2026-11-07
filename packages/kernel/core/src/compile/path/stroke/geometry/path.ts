import type { CurveSegment, CurveSegmentSample } from '@retikz/math';
import { curve } from '@retikz/math';

import type { PathCommand } from '../../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import type { IRPosition } from '../../../../schemas';
import { applyRoundedCorners } from './rounded-corners';

const DISTANCE_EPSILON = 1e-7;
const PARAMETER_BISECTION_STEPS = 32;
const CURVE_LENGTH_SAMPLES = 32;
type StrokeParameterBoundaryOwner = 'previous' | 'next';

/** Stroke command 在未断开的逻辑路径中的一次绘制 occurrence */
export type StrokeCommandOccurrence = {
  /** 原始 Scene command */
  command: PathCommand;
  /** command 在编译后数组中的下标 */
  commandIndex: number;
  /** 产生此 command 的 Source Path step 下标 */
  sourceStepIndex: number;
  /** 所属连续 sub-path 下标 */
  subPathIndex: number;
  /** command 的起点 */
  from: IRPosition;
  /** command 的终点；close 指向其 sub-path 起点 */
  to: IRPosition;
  /** 此 occurrence 的全局逻辑距离起点 */
  logicalStart: number;
  /** 此 occurrence 的全局逻辑距离终点 */
  logicalEnd: number;
  /** 所属 sub-path 的逻辑距离起点 */
  subPathLogicalStart: number;
  /** 所属 sub-path 的逻辑距离终点 */
  subPathLogicalEnd: number;
};

/** 逻辑路径的连续 sub-path 距离范围 */
type StrokeSubPathGeometry = {
  /** sub-path 下标 */
  index: number;
  /** 全局逻辑距离起点 */
  logicalStart: number;
  /** 全局逻辑距离终点 */
  logicalEnd: number;
};

/** interruption 与延迟标签采样共用的完整逻辑路径几何 */
export type StrokePathGeometry = {
  /** 所有可绘制 command occurrence */
  occurrences: Array<StrokeCommandOccurrence>;
  /** 每个连续 sub-path 的距离范围 */
  subPaths: Array<StrokeSubPathGeometry>;
  /** 所有 drawable command 的累计长度 */
  totalLength: number;
};

/** 标签在逻辑路径上的已物化采样结果 */
export type StrokeLabelSample = {
  /** 几何采样点与切线 */
  sample: CurveSegmentSample;
  /** 采样点在整条逻辑路径上的距离 */
  logicalDistance: number;
  /** 采样命中的 occurrence */
  occurrence: StrokeCommandOccurrence;
};

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));
type StrokeCommandGeometry = Pick<StrokeCommandOccurrence, 'command' | 'from' | 'to'>;

/** 将 Core 的最终 drawable command 映射为不含 Drawing 语义的 Math 曲线段 */
export const curveSegmentOfOccurrence = ({ command, from, to }: StrokeCommandGeometry): CurveSegment => {
  if (command.kind === 'line' || command.kind === 'close') {
    return { kind: 'line', from, to };
  }

  if (command.kind === 'quad') {
    return { kind: 'quadraticBezier', from, control: command.control, to };
  }

  if (command.kind === 'cubic') {
    return { kind: 'cubicBezier', from, control1: command.control1, control2: command.control2, to };
  }

  if (command.kind === 'arc') {
    return {
      kind: 'arc',
      center: command.center,
      radius: command.radius,
      startAngleDeg: command.startAngle,
      endAngleDeg: command.endAngle,
      counterClockwise: command.counterClockwise,
    };
  }

  if (command.kind === 'ellipseArc') {
    return {
      kind: 'ellipseArc',
      center: command.center,
      radiusX: command.radiusX,
      radiusY: command.radiusY,
      rotationDeg: command.rotation,
      startAngleDeg: command.startAngle,
      endAngleDeg: command.endAngle,
      counterClockwise: command.counterClockwise,
    };
  }

  throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Cannot map a non-drawable Stroke command to a curve.');
};

/** 在绘制 occurrence 的局部参数位置取点与切线 */
export const sampleStrokeOccurrence = (occurrence: StrokeCommandOccurrence, parameter: number): CurveSegmentSample =>
  curve.sampleAt(curveSegmentOfOccurrence(occurrence), clampUnit(parameter));

const approximateOccurrenceLength = (
  occurrence: Omit<StrokeCommandOccurrence, 'logicalStart' | 'logicalEnd'>,
): number =>
  curve.approximateLength(curveSegmentOfOccurrence(occurrence), {
    sampleCount: occurrence.command.kind === 'ellipseArc' ? CURVE_LENGTH_SAMPLES * 2 : CURVE_LENGTH_SAMPLES,
  });

const approximateOccurrenceLengthTo = (occurrence: StrokeCommandOccurrence, end: number): number => {
  const parameter = clampUnit(end);
  if (parameter <= DISTANCE_EPSILON) return 0;
  if (parameter >= 1 - DISTANCE_EPSILON) return occurrence.logicalEnd - occurrence.logicalStart;
  if (occurrence.command.kind === 'line' || occurrence.command.kind === 'close') {
    return (occurrence.logicalEnd - occurrence.logicalStart) * parameter;
  }

  if (occurrence.command.kind === 'arc') {
    return (occurrence.logicalEnd - occurrence.logicalStart) * parameter;
  }

  return curve.approximateLength(curve.slice(curveSegmentOfOccurrence(occurrence), 0, parameter), {
    sampleCount: Math.max(4, Math.ceil(CURVE_LENGTH_SAMPLES * parameter)),
  });
};

/** 将 occurrence 内的弧长距离换算为曲线参数 */
export const parameterAtStrokeOccurrenceDistance = (occurrence: StrokeCommandOccurrence, distance: number): number => {
  const length = occurrence.logicalEnd - occurrence.logicalStart;
  if (length <= DISTANCE_EPSILON) return 0;

  const clamped = Math.max(0, Math.min(length, distance));
  if (clamped <= DISTANCE_EPSILON) return 0;
  if (length - clamped <= DISTANCE_EPSILON) return 1;

  return curve.parameterAtDistance(curveSegmentOfOccurrence(occurrence), clamped, {
    sampleCount: CURVE_LENGTH_SAMPLES,
    totalLength: length,
    bisectionSteps: PARAMETER_BISECTION_STEPS,
  });
};

/** 从最终 commands 与其 source step provenance 建立逻辑绘制 occurrence */
export const createStrokePathGeometry = (
  commands: ReadonlyArray<PathCommand>,
  sourceStepIndexes: ReadonlyArray<number>,
): StrokePathGeometry => {
  const occurrences: Array<StrokeCommandOccurrence> = [];
  const subPaths: Array<StrokeSubPathGeometry> = [];
  let cursor: IRPosition | undefined;
  let subPathStart: IRPosition | undefined;
  let subPathIndex = -1;
  let logicalDistance = 0;

  for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
    const command = commands[commandIndex];
    if (command.kind === 'move') {
      cursor = [command.to[0], command.to[1]];
      subPathStart = cursor;
      subPathIndex += 1;
      subPaths.push({ index: subPathIndex, logicalStart: logicalDistance, logicalEnd: logicalDistance });
      continue;
    }

    if (cursor === undefined || subPathStart === undefined || subPathIndex < 0) continue;

    let from = cursor;
    let to: IRPosition;
    if (command.kind === 'line') {
      to = [command.to[0], command.to[1]];
    } else if (command.kind === 'quad' || command.kind === 'cubic') {
      to = [command.to[0], command.to[1]];
    } else if (command.kind === 'arc' || command.kind === 'ellipseArc') {
      const arcSegment = curveSegmentOfOccurrence({ command, from: cursor, to: cursor });
      from = curve.sampleAt(arcSegment, 0).point;
      to = curve.sampleAt(arcSegment, 1).point;
    } else {
      to = subPathStart;
    }

    const rawOccurrence = {
      command,
      commandIndex,
      sourceStepIndex: sourceStepIndexes[commandIndex] ?? -1,
      subPathIndex,
      from,
      to,
      subPathLogicalStart: subPaths[subPathIndex].logicalStart,
      subPathLogicalEnd: 0,
    };
    const length = approximateOccurrenceLength(rawOccurrence);
    const occurrence: StrokeCommandOccurrence = {
      ...rawOccurrence,
      logicalStart: logicalDistance,
      logicalEnd: logicalDistance + length,
    };
    occurrences.push(occurrence);
    logicalDistance = occurrence.logicalEnd;
    cursor = to;
    subPaths[subPathIndex].logicalEnd = logicalDistance;
  }

  for (const occurrence of occurrences) {
    occurrence.subPathLogicalEnd = subPaths[occurrence.subPathIndex]?.logicalEnd ?? occurrence.logicalEnd;
  }

  return { occurrences, subPaths, totalLength: logicalDistance };
};

const sampleGeometryOccurrences = (
  occurrences: ReadonlyArray<StrokeCommandOccurrence>,
  position: number,
): StrokeLabelSample | undefined => {
  if (occurrences.length === 0) return undefined;

  const totalLength = occurrences.reduce(
    (length, occurrence) => length + occurrence.logicalEnd - occurrence.logicalStart,
    0,
  );
  if (!Number.isFinite(totalLength) || totalLength <= DISTANCE_EPSILON) return undefined;

  const lastDrawableIndex = occurrences.findLastIndex(
    occurrence => occurrence.logicalEnd - occurrence.logicalStart > DISTANCE_EPSILON,
  );
  const target = clampUnit(position) * totalLength;
  let consumed = 0;

  for (let index = 0; index < occurrences.length; index += 1) {
    const occurrence = occurrences[index];
    const length = occurrence.logicalEnd - occurrence.logicalStart;
    if (length <= DISTANCE_EPSILON) continue;
    if (target < consumed + length - DISTANCE_EPSILON || index === lastDrawableIndex) {
      const localDistance = Math.max(0, Math.min(length, target - consumed));
      const parameter = parameterAtStrokeOccurrenceDistance(occurrence, localDistance);

      return {
        sample: sampleStrokeOccurrence(occurrence, parameter),
        logicalDistance: occurrence.logicalStart + localDistance,
        occurrence,
      };
    }

    consumed += length;
  }

  return undefined;
};

/** 按整条未切断逻辑路径采样 host label */
export const sampleStrokePathGeometry = (
  geometry: StrokePathGeometry,
  position: number,
): StrokeLabelSample | undefined => sampleGeometryOccurrences(geometry.occurrences, position);

/** 沿路径采样标记，驻点使用前进侧切线，末端使用进入侧切线 */
export const sampleStrokeMarkGeometry = (
  geometry: StrokePathGeometry,
  position: number,
): CurveSegmentSample | undefined => {
  const located = sampleStrokePathGeometry(geometry, position);
  if (located === undefined) return undefined;
  const { occurrence, logicalDistance, sample } = located;
  const segment = curveSegmentOfOccurrence(occurrence);
  if (segment.kind !== 'quadraticBezier' && segment.kind !== 'cubicBezier') return sample;
  const t = parameterAtStrokeOccurrenceDistance(occurrence, logicalDistance - occurrence.logicalStart);
  const inverse = 1 - t;
  const derivative = (axis: 0 | 1): number =>
    segment.kind === 'quadraticBezier'
      ? 2 * (inverse * (segment.control[axis] - segment.from[axis]) + t * (segment.to[axis] - segment.control[axis]))
      : 3 *
        (inverse * inverse * (segment.control1[axis] - segment.from[axis]) +
          2 * inverse * t * (segment.control2[axis] - segment.control1[axis]) +
          t * t * (segment.to[axis] - segment.control2[axis]));
  if (Math.hypot(derivative(0), derivative(1)) > DISTANCE_EPSILON) return sample;
  const nearby = Math.min(1, Math.max(0, t + (position === 1 ? -1e-4 : 1e-4)));
  return { point: sample.point, tangent: curve.sampleAt(segment, nearby).tangent };
};

/**
 * 建立单次编译内的步骤索引，按既有 step-local 参数语义采样
 * @description 普通 step 保持原有单 command 参数、fold / smooth 保持按产生 command 等分
 */
export const createStrokeStepSampler = (geometry: StrokePathGeometry) => {
  const occurrencesByStep = new Map<number, Array<StrokeCommandOccurrence>>();
  for (const occurrence of geometry.occurrences) {
    const occurrences = occurrencesByStep.get(occurrence.sourceStepIndex);
    if (occurrences === undefined) occurrencesByStep.set(occurrence.sourceStepIndex, [occurrence]);
    else occurrences.push(occurrence);
  }
  return (
    sourceStepIndex: number,
    position: number,
    boundaryOwner: StrokeParameterBoundaryOwner = 'next',
  ): StrokeLabelSample | undefined => {
    const occurrences = occurrencesByStep.get(sourceStepIndex);
    if (occurrences === undefined || occurrences.length === 0) return undefined;

    const scaled = clampUnit(position) * occurrences.length;
    const isInteriorBoundary =
      scaled > DISTANCE_EPSILON &&
      scaled < occurrences.length - DISTANCE_EPSILON &&
      Math.abs(scaled - Math.round(scaled)) <= DISTANCE_EPSILON;
    const occurrenceIndex =
      boundaryOwner === 'previous' && isInteriorBoundary
        ? Math.max(0, Math.ceil(scaled) - 1)
        : Math.min(Math.floor(scaled), occurrences.length - 1);
    const localParameter = position === 1 ? 1 : scaled - occurrenceIndex;
    const occurrence = occurrences[occurrenceIndex];
    const localDistance = approximateOccurrenceLengthTo(occurrence, localParameter);

    return {
      sample: sampleStrokeOccurrence(occurrence, localParameter),
      logicalDistance: occurrence.logicalStart + localDistance,
      occurrence,
    };
  };
};

const roundPoint = (point: IRPosition, round: (value: number) => number): IRPosition => [
  round(point[0]),
  round(point[1]),
];

/** 保留原曲线形状，输出给定参数区间的命令 */
export const sliceOccurrenceCommand = (
  occurrence: StrokeCommandOccurrence,
  fromParameter: number,
  toParameter: number,
  round: (value: number) => number,
): PathCommand => {
  const start = clampUnit(fromParameter);
  const end = clampUnit(toParameter);
  const segment = curve.slice(curveSegmentOfOccurrence(occurrence), start, end);
  if (segment.kind === 'line') {
    return { kind: 'line', to: roundPoint(segment.to, round) };
  }

  if (segment.kind === 'quadraticBezier') {
    return {
      kind: 'quad',
      control: roundPoint(segment.control, round),
      to: roundPoint(segment.to, round),
    };
  }

  if (segment.kind === 'cubicBezier') {
    return {
      kind: 'cubic',
      control1: roundPoint(segment.control1, round),
      control2: roundPoint(segment.control2, round),
      to: roundPoint(segment.to, round),
    };
  }

  if (segment.kind === 'arc') {
    const sliced: Extract<PathCommand, { kind: 'arc' }> = {
      kind: 'arc',
      center: roundPoint(segment.center, round),
      radius: round(segment.radius),
      startAngle: segment.startAngleDeg,
      endAngle: segment.endAngleDeg,
    };
    if (segment.counterClockwise !== undefined) sliced.counterClockwise = segment.counterClockwise;

    return sliced;
  }

  const sliced: Extract<PathCommand, { kind: 'ellipseArc' }> = {
    kind: 'ellipseArc',
    center: roundPoint(segment.center, round),
    radiusX: round(segment.radiusX),
    radiusY: round(segment.radiusY),
    startAngle: segment.startAngleDeg,
    endAngle: segment.endAngleDeg,
  };
  if (segment.rotationDeg !== undefined) sliced.rotation = segment.rotationDeg;
  if (segment.counterClockwise !== undefined) sliced.counterClockwise = segment.counterClockwise;

  return sliced;
};

/** 按绘制段均分参数采样参考路径；圆角路径按最终几何弧长采样 */
export const samplePathRoute = (
  commands: ReadonlyArray<PathCommand>,
  cornerRadius: number,
  position: number,
): CurveSegmentSample | undefined => {
  const sourceStepIndexes = commands.map((_, index) => index);
  if (cornerRadius > 0) {
    const rounded = applyRoundedCorners({
      commands: [...commands],
      provenance: commands.map(command => command.kind),
      sourceStepIndexes,
      radius: cornerRadius,
      round: coordinate => coordinate,
    });
    return sampleStrokePathGeometry(createStrokePathGeometry(rounded.commands, rounded.sourceStepIndexes), position)
      ?.sample;
  }
  const geometry = createStrokePathGeometry(commands, sourceStepIndexes);
  if (geometry.occurrences.length === 0) return undefined;
  const scaled = position * geometry.occurrences.length;
  const index = Math.min(Math.floor(scaled), geometry.occurrences.length - 1);
  return createStrokeStepSampler(geometry)(
    geometry.occurrences[index].sourceStepIndex,
    position === 1 ? 1 : scaled - index,
  )?.sample;
};
