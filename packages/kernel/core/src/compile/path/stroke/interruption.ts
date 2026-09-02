import type { CurveSegment, CurveSegmentSample } from '@retikz/math';

import { curve, isFinitePoint } from '@retikz/math';

import type { PathCommand } from '../../../contract';
import type { IRPosition } from '../../../schemas';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';

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
export type StrokeSubPathGeometry = {
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

/** 合并后的断口区间 */
export type StrokeInterruptionInterval = {
  /** 断口所属 sub-path */
  subPathIndex: number;
  /** 断口起点的全局逻辑距离 */
  start: number;
  /** 断口终点的全局逻辑距离 */
  end: number;
};

/** 不允许 interruption 覆盖的逻辑路径范围 */
export type StrokeInterruptionProtectedRange = {
  /** 保护范围所属 sub-path */
  subPathIndex: number;
  /** 保护范围的逻辑起点 */
  start: number;
  /** 保护范围的逻辑终点 */
  end: number;
};

/** command-preserving split 产出的一个可见 path fragment */
export type StrokeCommandFragment = {
  /** fragment 的结构化命令 */
  commands: Array<PathCommand>;
  /** fragment 在逻辑路径中的可见起点距离 */
  logicalStart: number;
  /** fragment 在逻辑路径中的可见终点距离 */
  logicalEnd: number;
  /** fragment 包含原 path 首个可绘制 command 的逻辑起点 */
  hasPathStart: boolean;
  /** fragment 包含原 path 末个非 close 可绘制 command 的逻辑终点 */
  hasPathEnd: boolean;
};

/** interruption split 的可选终端输出语义 */
export type SplitStrokePathOptions = {
  /** 末端箭头需要单独以最后一个非 close drawable command 结束 fragment */
  separateTerminalDrawable?: boolean;
};

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value));

const pointsEqual = (left: IRPosition, right: IRPosition): boolean =>
  Math.abs(left[0] - right[0]) <= DISTANCE_EPSILON && Math.abs(left[1] - right[1]) <= DISTANCE_EPSILON;

type StrokeCommandGeometry = Pick<StrokeCommandOccurrence, 'command' | 'from' | 'to'>;

/** 将 Core 的最终 drawable command 映射为不含 Drawing 语义的 Math 曲线段 */
const curveSegmentOfOccurrence = ({ command, from, to }: StrokeCommandGeometry): CurveSegment => {
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

const sampleOccurrenceAt = (occurrence: StrokeCommandOccurrence, parameter: number): CurveSegmentSample =>
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

const parameterAtOccurrenceDistance = (occurrence: StrokeCommandOccurrence, distance: number): number => {
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
  const target = clampUnit(position) * totalLength;
  let consumed = 0;
  for (let index = 0; index < occurrences.length; index += 1) {
    const occurrence = occurrences[index];
    const length = occurrence.logicalEnd - occurrence.logicalStart;
    if (target < consumed + length - DISTANCE_EPSILON || index === occurrences.length - 1) {
      const localDistance = Math.max(0, Math.min(length, target - consumed));
      const parameter = parameterAtOccurrenceDistance(occurrence, localDistance);
      return {
        sample: sampleOccurrenceAt(occurrence, parameter),
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

/** 按 source step 产生的 occurrence range 采样 step label */
export const sampleStrokeStepGeometry = (
  geometry: StrokePathGeometry,
  sourceStepIndex: number,
  position: number,
): StrokeLabelSample | undefined =>
  sampleGeometryOccurrences(
    geometry.occurrences.filter(occurrence => occurrence.sourceStepIndex === sourceStepIndex),
    position,
  );

/**
 * 按既有 step-local 参数语义采样 occurrence range
 * @description 普通 step 保持原有单 command 参数、fold / smooth 保持按产生 command 等分；generator 另走真实距离采样
 */
export const sampleStrokeStepParameterGeometry = (
  geometry: StrokePathGeometry,
  sourceStepIndex: number,
  position: number,
  boundaryOwner: StrokeParameterBoundaryOwner = 'next',
): StrokeLabelSample | undefined => {
  const occurrences = geometry.occurrences.filter(occurrence => occurrence.sourceStepIndex === sourceStepIndex);
  if (occurrences.length === 0) return undefined;
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
    sample: sampleOccurrenceAt(occurrence, localParameter),
    logicalDistance: occurrence.logicalStart + localDistance,
    occurrence,
  };
};

/** 从一个已物化标签的视觉 bbox 构造并合并可见 Stroke 断口 */
export const createStrokeInterruptionIntervals = (
  labels: ReadonlyArray<{
    sample: StrokeLabelSample;
    visualBoundsPoints: ReadonlyArray<IRPosition>;
  }>,
  strokeWidth: number,
  protectedRanges: ReadonlyArray<StrokeInterruptionProtectedRange> = [],
): Array<StrokeInterruptionInterval> => {
  const intervals: Array<StrokeInterruptionInterval> = [];
  for (const label of labels) {
    const { sample, visualBoundsPoints } = label;
    if (
      !Number.isFinite(sample.logicalDistance) ||
      !isFinitePoint(sample.sample.point) ||
      !isFinitePoint(sample.sample.tangent) ||
      !Number.isFinite(strokeWidth) ||
      visualBoundsPoints.length === 0
    ) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        'Cannot determine finite Stroke label interruption geometry.',
      );
    }
    const tangent = sample.sample.tangent;
    let halfProjection = 0;
    for (const point of visualBoundsPoints) {
      if (!isFinitePoint(point)) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          'Cannot determine finite Stroke label interruption geometry.',
        );
      }
      const projection = Math.abs(
        (point[0] - sample.sample.point[0]) * tangent[0] + (point[1] - sample.sample.point[1]) * tangent[1],
      );
      halfProjection = Math.max(halfProjection, projection);
    }
    const clearance = Math.max(0, strokeWidth) / 2;
    const start = Math.max(sample.occurrence.subPathLogicalStart, sample.logicalDistance - halfProjection - clearance);
    const end = Math.min(sample.occurrence.subPathLogicalEnd, sample.logicalDistance + halfProjection + clearance);
    let intervalParts: Array<{ start: number; end: number }> = [{ start, end }];
    for (const protectedRange of protectedRanges) {
      if (protectedRange.subPathIndex !== sample.occurrence.subPathIndex) continue;
      intervalParts = intervalParts.flatMap(interval => {
        if (
          protectedRange.end <= interval.start + DISTANCE_EPSILON ||
          protectedRange.start >= interval.end - DISTANCE_EPSILON
        ) {
          return [interval];
        }
        const parts: Array<{ start: number; end: number }> = [];
        if (interval.start < protectedRange.start - DISTANCE_EPSILON) {
          parts.push({ start: interval.start, end: Math.min(interval.end, protectedRange.start) });
        }
        if (interval.end > protectedRange.end + DISTANCE_EPSILON) {
          parts.push({ start: Math.max(interval.start, protectedRange.end), end: interval.end });
        }
        return parts;
      });
    }
    for (const interval of intervalParts) {
      if (interval.end - interval.start > DISTANCE_EPSILON) {
        intervals.push({ subPathIndex: sample.occurrence.subPathIndex, start: interval.start, end: interval.end });
      }
    }
  }

  const ordered = [...intervals].sort(
    (left, right) => left.subPathIndex - right.subPathIndex || left.start - right.start,
  );
  const merged: Array<StrokeInterruptionInterval> = [];
  for (const interval of ordered) {
    const previous = merged.at(-1);
    if (
      previous !== undefined &&
      previous.subPathIndex === interval.subPathIndex &&
      interval.start <= previous.end + DISTANCE_EPSILON
    ) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
};

const roundPoint = (point: IRPosition, round: (value: number) => number): IRPosition => [
  round(point[0]),
  round(point[1]),
];

const sliceOccurrenceCommand = (
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

const visibleRangesForOccurrence = (
  occurrence: StrokeCommandOccurrence,
  intervals: ReadonlyArray<StrokeInterruptionInterval>,
): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = occurrence.logicalStart;
  for (const interval of intervals) {
    if (interval.end <= cursor + DISTANCE_EPSILON) continue;
    if (interval.start >= occurrence.logicalEnd - DISTANCE_EPSILON) break;
    if (interval.start > cursor + DISTANCE_EPSILON) {
      ranges.push({ start: cursor, end: Math.min(interval.start, occurrence.logicalEnd) });
    }
    cursor = Math.max(cursor, interval.end);
    if (cursor >= occurrence.logicalEnd - DISTANCE_EPSILON) break;
  }
  if (cursor < occurrence.logicalEnd - DISTANCE_EPSILON) ranges.push({ start: cursor, end: occurrence.logicalEnd });
  return ranges;
};

/** 按合并后的断口区间切分 command，同时保留原有 command kind */
export const splitStrokePathAtInterruptions = (
  geometry: StrokePathGeometry,
  intervals: ReadonlyArray<StrokeInterruptionInterval>,
  round: (value: number) => number,
  options: SplitStrokePathOptions = {},
): Array<StrokeCommandFragment> => {
  if (intervals.length === 0) return [];
  const intervalsBySubPath = new Map<number, Array<StrokeInterruptionInterval>>();
  for (const interval of intervals) {
    const current = intervalsBySubPath.get(interval.subPathIndex) ?? [];
    current.push(interval);
    intervalsBySubPath.set(interval.subPathIndex, current);
  }
  const fragments: Array<StrokeCommandFragment> = [];
  const firstDrawableCommandIndex = geometry.occurrences.find(
    occurrence => occurrence.command.kind !== 'close',
  )?.commandIndex;
  let lastDrawableCommandIndex: number | undefined;
  for (let index = geometry.occurrences.length - 1; index >= 0; index -= 1) {
    if (geometry.occurrences[index].command.kind !== 'close') {
      lastDrawableCommandIndex = geometry.occurrences[index].commandIndex;
      break;
    }
  }
  const hasClosingOccurrenceAfterTerminalDrawable = geometry.occurrences.some(
    occurrence =>
      occurrence.command.kind === 'close' &&
      lastDrawableCommandIndex !== undefined &&
      occurrence.commandIndex > lastDrawableCommandIndex,
  );
  let current:
    | {
        subPathIndex: number;
        commands: Array<PathCommand>;
        logicalStart: number;
        logicalEnd: number;
        lastPoint: IRPosition;
        hasPathStart: boolean;
        hasPathEnd: boolean;
      }
    | undefined;

  const finishCurrent = (): void => {
    if (current !== undefined && current.commands.length > 1) {
      fragments.push({
        commands: current.commands,
        logicalStart: current.logicalStart,
        logicalEnd: current.logicalEnd,
        hasPathStart: current.hasPathStart,
        hasPathEnd: current.hasPathEnd,
      });
    }
    current = undefined;
  };

  for (const occurrence of geometry.occurrences) {
    const subPathIntervals = intervalsBySubPath.get(occurrence.subPathIndex) ?? [];
    const subPathIsInterrupted = subPathIntervals.length > 0;
    const visibleRanges = visibleRangesForOccurrence(occurrence, subPathIntervals);
    if (visibleRanges.length === 0) {
      finishCurrent();
      continue;
    }

    for (const range of visibleRanges) {
      const fromDistance = range.start - occurrence.logicalStart;
      const toDistance = range.end - occurrence.logicalStart;
      const fromParameter = parameterAtOccurrenceDistance(occurrence, fromDistance);
      const toParameter = parameterAtOccurrenceDistance(occurrence, toDistance);
      const startPoint = sampleOccurrenceAt(occurrence, fromParameter).point;
      const endPoint = sampleOccurrenceAt(occurrence, toParameter).point;
      const joinsCurrent =
        current !== undefined &&
        current.subPathIndex === occurrence.subPathIndex &&
        Math.abs(range.start - occurrence.logicalStart) <= DISTANCE_EPSILON &&
        pointsEqual(current.lastPoint, startPoint);
      if (!joinsCurrent) {
        finishCurrent();
        current = {
          subPathIndex: occurrence.subPathIndex,
          commands: [{ kind: 'move', to: roundPoint(startPoint, round) }],
          logicalStart: range.start,
          logicalEnd: range.start,
          lastPoint: startPoint,
          hasPathStart: false,
          hasPathEnd: false,
        };
      }
      if (current === undefined) {
        throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Cannot create an interrupted Stroke fragment.');
      }
      const fragment = current;

      if (
        occurrence.command.kind === 'close' &&
        !subPathIsInterrupted &&
        fromParameter <= DISTANCE_EPSILON &&
        toParameter >= 1 - DISTANCE_EPSILON
      ) {
        fragment.commands.push({ kind: 'close' });
      } else {
        fragment.commands.push(sliceOccurrenceCommand(occurrence, fromParameter, toParameter, round));
      }
      fragment.logicalEnd = range.end;
      fragment.lastPoint = endPoint;
      if (occurrence.commandIndex === firstDrawableCommandIndex && fromParameter <= DISTANCE_EPSILON) {
        fragment.hasPathStart = true;
      }
      if (occurrence.commandIndex === lastDrawableCommandIndex && toParameter >= 1 - DISTANCE_EPSILON) {
        fragment.hasPathEnd = true;
      }
      if (
        options.separateTerminalDrawable === true &&
        hasClosingOccurrenceAfterTerminalDrawable &&
        occurrence.commandIndex === lastDrawableCommandIndex
      ) {
        finishCurrent();
      }
    }

    if (Math.abs(occurrence.logicalEnd - occurrence.subPathLogicalEnd) <= DISTANCE_EPSILON) finishCurrent();
  }
  finishCurrent();
  return fragments;
};
