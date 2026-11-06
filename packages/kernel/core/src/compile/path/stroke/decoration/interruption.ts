import { isFinitePoint } from '@retikz/math';

import type { PathCommand } from '../../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import type { IRPosition } from '../../../../schemas';
import type { StrokeCommandOccurrence, StrokePathGeometry, StrokeLabelSample } from '../geometry';
import { parameterAtStrokeOccurrenceDistance, sampleStrokeOccurrence, sliceOccurrenceCommand } from '../geometry';

const DISTANCE_EPSILON = 1e-7;
const arePointsEqual = (left: IRPosition, right: IRPosition): boolean =>
  Math.abs(left[0] - right[0]) <= DISTANCE_EPSILON && Math.abs(left[1] - right[1]) <= DISTANCE_EPSILON;
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
type SplitStrokePathOptions = {
  /** 末端箭头需要单独以最后一个非 close drawable command 结束 fragment */
  separateTerminalDrawable?: boolean;
};

/** 从一个已物化标签的视觉 bbox 构造并合并可见 Stroke 断口 */
export const createStrokeInterruptionIntervals = (
  labels: ReadonlyArray<{
    sample: StrokeLabelSample;
    visualBoundsPoints: ReadonlyArray<IRPosition>;
    gap: number;
  }>,
  strokeWidth: number,
  protectedRanges: ReadonlyArray<StrokeInterruptionProtectedRange> = [],
): Array<StrokeInterruptionInterval> => {
  const intervals: Array<StrokeInterruptionInterval> = [];

  for (const label of labels) {
    const { sample, visualBoundsPoints, gap } = label;
    if (
      !Number.isFinite(sample.logicalDistance) ||
      !isFinitePoint(sample.sample.point) ||
      !isFinitePoint(sample.sample.tangent) ||
      !Number.isFinite(strokeWidth) ||
      !Number.isFinite(gap) ||
      visualBoundsPoints.length === 0
    ) {
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        'Cannot determine finite Stroke label interruption geometry.',
      );
    }

    const tangent = sample.sample.tangent;
    let minimumProjection = Infinity;
    let maximumProjection = -Infinity;

    for (const point of visualBoundsPoints) {
      if (!isFinitePoint(point)) {
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          'Cannot determine finite Stroke label interruption geometry.',
        );
      }

      const projection =
        (point[0] - sample.sample.point[0]) * tangent[0] + (point[1] - sample.sample.point[1]) * tangent[1];
      minimumProjection = Math.min(minimumProjection, projection);
      maximumProjection = Math.max(maximumProjection, projection);
    }

    const clearance = Math.max(0, strokeWidth) / 2 + gap;
    const start = Math.max(
      sample.occurrence.subPathLogicalStart,
      sample.logicalDistance + minimumProjection - clearance,
    );
    const end = Math.min(sample.occurrence.subPathLogicalEnd, sample.logicalDistance + maximumProjection + clearance);
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
const visibleRangesForOccurrence = (
  occurrence: StrokeCommandOccurrence,
  intervals: ReadonlyArray<StrokeInterruptionInterval>,
  firstIntervalIndex: number,
): Array<{ start: number; end: number }> => {
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = occurrence.logicalStart;

  for (let index = firstIntervalIndex; index < intervals.length; index++) {
    const interval = intervals[index];
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

  const finishCurrentFragment = (): void => {
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

  // ⚡occurrence 与合并断口按逻辑距离有序，跨过的断口无需从头扫描
  let activeSubPathIndex = -1;
  let firstIntervalIndex = 0;
  for (const occurrence of geometry.occurrences) {
    const subPathIntervals = intervalsBySubPath.get(occurrence.subPathIndex) ?? [];
    const subPathIsInterrupted = subPathIntervals.length > 0;
    if (activeSubPathIndex !== occurrence.subPathIndex) {
      activeSubPathIndex = occurrence.subPathIndex;
      firstIntervalIndex = 0;
    }
    while (
      firstIntervalIndex < subPathIntervals.length &&
      subPathIntervals[firstIntervalIndex].end <= occurrence.logicalStart + DISTANCE_EPSILON
    )
      firstIntervalIndex++;
    const visibleRanges = visibleRangesForOccurrence(occurrence, subPathIntervals, firstIntervalIndex);
    if (visibleRanges.length === 0) {
      finishCurrentFragment();
      continue;
    }

    for (const range of visibleRanges) {
      const fromDistance = range.start - occurrence.logicalStart;
      const toDistance = range.end - occurrence.logicalStart;
      const fromParameter = parameterAtStrokeOccurrenceDistance(occurrence, fromDistance);
      const toParameter = parameterAtStrokeOccurrenceDistance(occurrence, toDistance);
      const startPoint = sampleStrokeOccurrence(occurrence, fromParameter).point;
      const endPoint = sampleStrokeOccurrence(occurrence, toParameter).point;
      const joinsCurrent =
        current !== undefined &&
        current.subPathIndex === occurrence.subPathIndex &&
        Math.abs(range.start - occurrence.logicalStart) <= DISTANCE_EPSILON &&
        arePointsEqual(current.lastPoint, startPoint);
      if (!joinsCurrent) {
        finishCurrentFragment();
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
        finishCurrentFragment();
      }
    }

    if (Math.abs(occurrence.logicalEnd - occurrence.subPathLogicalEnd) <= DISTANCE_EPSILON) finishCurrentFragment();
  }

  finishCurrentFragment();

  return fragments;
};
