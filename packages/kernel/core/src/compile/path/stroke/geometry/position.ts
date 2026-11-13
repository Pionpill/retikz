import { curveMetrics } from '@retikz/math';
import type { CurveSegmentSample } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import { PathPositionGeometry, PathPositionMode } from '../../../../schemas';
import type { LoweredStrokePathGeometry } from '../types';
import { createStrokePathGeometry, sampleStrokeOccurrence } from './path';
import type { StrokeCommandOccurrence, StrokeLabelSample, StrokePathGeometry } from './path';

/** 一个可定位区间，长度与步进权重在准备阶段计算 */
type StrokePositionSpan = {
  /** 区间所属的绘制段与测量模型 */
  occurrence: StrokeCommandOccurrence;
  /** 绘制段中的起始参数 */
  from: number;
  /** 绘制段中的终止参数 */
  to: number;
  /** 在当前查询表中的累计步骤权重 */
  stepEnd: number;
  /** 在当前查询表中的累计长度 */
  lengthEnd: number;
};

/** 准备后的原始与圆角定位索引，按源步骤持有局部查询表 */
export type StrokePositionModel = {
  /** 可在仅圆角改变时独立复用的原始度量 */
  original: StrokePathGeometry;
  /** 原始路径的宿主查询表 */
  originalSpans: Array<StrokePositionSpan>;
  /** 最终圆角路径的宿主查询表 */
  roundedSpans: Array<StrokePositionSpan>;
  /** 按源步骤索引的原始局部表 */
  originalSteps: Map<number, Array<StrokePositionSpan>>;
  /** 按源步骤参数顺序排列的圆角局部表 */
  roundedSteps: Map<number, Array<StrokePositionSpan>>;
  /** 原始命令参数到最终命令区间的映射 */
  mappings: Map<number, Array<{ span: StrokePositionSpan; sourceFrom: number; sourceTo: number }>>;
};

/** 建立不依赖 position 值的定位索引 */
export const createStrokePositionModel = (
  geometry: LoweredStrokePathGeometry,
  rounded: StrokePathGeometry,
  preparedOriginal?: StrokePathGeometry,
): StrokePositionModel => {
  const original =
    preparedOriginal ??
    (geometry.roundedCommands
      ? createStrokePathGeometry(geometry.originalCommands, geometry.originalStepIndexes)
      : rounded);
  const originalSpans: Array<StrokePositionSpan> = [];
  const roundedSpans: Array<StrokePositionSpan> = [];
  const originalSteps = new Map<number, Array<StrokePositionSpan>>();
  const roundedSteps = new Map<number, Array<StrokePositionSpan>>();
  const mappings: StrokePositionModel['mappings'] = new Map();
  const append = (
    spans: Array<StrokePositionSpan>,
    occurrence: StrokeCommandOccurrence,
    from: number,
    to: number,
    weight: number,
  ): StrokePositionSpan => {
    const previous = spans.at(-1);
    const lengthStart = previous?.lengthEnd ?? 0;
    const span = {
      occurrence,
      from,
      to,
      stepEnd: (previous?.stepEnd ?? 0) + weight,
      lengthEnd:
        lengthStart +
        (curveMetrics.distanceAt(occurrence.metrics, to) - curveMetrics.distanceAt(occurrence.metrics, from)),
    };
    if (!Number.isFinite(span.lengthEnd))
      throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Path positioning length is not finite.');
    spans.push(span);
    return span;
  };
  const appendStep = (
    steps: Map<number, Array<StrokePositionSpan>>,
    sourceStep: number,
    occurrence: StrokeCommandOccurrence,
    from: number,
    to: number,
    weight: number,
  ) => {
    let spans = steps.get(sourceStep);
    if (spans === undefined) {
      spans = [];
      steps.set(sourceStep, spans);
    }
    append(spans, occurrence, from, to, weight);
  };
  const roundedByCommand = new Map(rounded.occurrences.map(occurrence => [occurrence.commandIndex, occurrence]));
  const originalByCommand = new Map(original.occurrences.map(occurrence => [occurrence.commandIndex, occurrence]));
  for (const occurrence of original.occurrences) {
    if (occurrence.metrics.length <= 0) continue;
    append(originalSpans, occurrence, 0, 1, 1);
    appendStep(originalSteps, occurrence.sourceStepIndex, occurrence, 0, 1, 1);
  }
  for (const [commandIndex, sources] of geometry.spans.entries()) {
    const occurrence = roundedByCommand.get(commandIndex);
    if (occurrence === undefined || occurrence.metrics.length <= 0) continue;
    for (const source of sources) {
      const originalOccurrence = originalByCommand.get(source.sourceCommandIndex);
      if (originalOccurrence === undefined || originalOccurrence.metrics.length <= 0) continue;
      const [from, to] = source.commandRange;
      const [sourceFrom, sourceTo] = source.sourceRange;
      if (sourceTo <= sourceFrom) continue;
      const span = append(roundedSpans, occurrence, from, to, sourceTo - sourceFrom);
      const mapping = { span, sourceFrom, sourceTo };
      const existing = mappings.get(source.sourceCommandIndex);
      if (existing === undefined) mappings.set(source.sourceCommandIndex, [mapping]);
      else existing.push(mapping);
    }
  }
  for (const entries of mappings.values()) entries.sort((a, b) => a.sourceFrom - b.sourceFrom);
  // 闭合路径的首段起始圆角位于命令序列末尾，步骤局部顺序仍按源参数排列
  for (const originalOccurrence of original.occurrences)
    for (const { span, sourceFrom, sourceTo } of mappings.get(originalOccurrence.commandIndex) ?? [])
      appendStep(
        roundedSteps,
        originalOccurrence.sourceStepIndex,
        span.occurrence,
        span.from,
        span.to,
        sourceTo - sourceFrom,
      );
  return { original, originalSpans, roundedSpans, originalSteps, roundedSteps, mappings };
};

/** 在累计权重表中二分定位，内部接缝归下一段 */
const locateSpan = (spans: ReadonlyArray<StrokePositionSpan>, position: number, mode: PathPositionMode) => {
  if (spans.length === 0) return undefined;
  const field = mode === PathPositionMode.Step ? 'stepEnd' : 'lengthEnd';
  const target = Math.max(0, Math.min(1, position)) * spans[spans.length - 1][field];
  let lower = 0;
  let upper = spans.length - 1;
  while (lower < upper) {
    const middle = (lower + upper) >>> 1;
    if (spans[middle][field] <= target) lower = middle + 1;
    else upper = middle;
  }
  const span = spans[lower];
  const start = lower === 0 ? 0 : spans[lower - 1][field];
  const parameter =
    mode === PathPositionMode.Step
      ? span.from + (span.to - span.from) * ((target - start) / (span.stepEnd - start))
      : curveMetrics.parameterAt(
          span.occurrence.metrics,
          curveMetrics.distanceAt(span.occurrence.metrics, span.from) + target - start,
        );
  return { span, parameter };
};

/** 共用标签和标记的双模式查询；original 已被圆角移除时不返回断线位置 */
export const sampleStrokePosition = (
  model: StrokePositionModel,
  position: number,
  mode: PathPositionMode,
  geometry: PathPositionGeometry,
  sourceStepIndex?: number,
): { visual: CurveSegmentSample; logical?: StrokeLabelSample } | undefined => {
  // 圆角 step 必须先定位原始段，再映射；闭合接缝不能改变原始参数起点
  const useOriginal = geometry === PathPositionGeometry.Original || mode === PathPositionMode.Step;
  const spans =
    sourceStepIndex === undefined
      ? useOriginal
        ? model.originalSpans
        : model.roundedSpans
      : ((useOriginal ? model.originalSteps : model.roundedSteps).get(sourceStepIndex) ?? []);
  const located = locateSpan(spans, position, mode);
  if (located === undefined) return undefined;
  let { parameter } = located;
  let occurrence = located.span.occurrence;
  const originalSample = sampleStrokeOccurrence(occurrence, parameter);
  if (useOriginal) {
    const mappings = model.mappings.get(occurrence.commandIndex) ?? [];
    const mapping = mappings.find(
      (entry, index) =>
        parameter >= entry.sourceFrom &&
        (parameter < entry.sourceTo || (index === mappings.length - 1 && parameter <= entry.sourceTo)),
    );
    if (mapping === undefined) return { visual: originalSample };
    const fraction = (parameter - mapping.sourceFrom) / (mapping.sourceTo - mapping.sourceFrom);
    parameter = mapping.span.from + fraction * (mapping.span.to - mapping.span.from);
    if (
      geometry === PathPositionGeometry.Original &&
      mapping.span.occurrence.command.kind === 'arc' &&
      occurrence.command.kind !== 'arc' &&
      parameter > 1e-12 &&
      parameter < 1 - 1e-12
    )
      return { visual: originalSample };
    occurrence = mapping.span.occurrence;
  }
  const logical = {
    occurrence,
    sample: sampleStrokeOccurrence(occurrence, parameter),
    logicalDistance: occurrence.logicalStart + curveMetrics.distanceAt(occurrence.metrics, parameter),
  };
  return { visual: geometry === PathPositionGeometry.Original ? originalSample : logical.sample, logical };
};
