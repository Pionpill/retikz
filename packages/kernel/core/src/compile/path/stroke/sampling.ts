import type { PropertyPath } from '@retikz/foundation';
import type { CurveSegmentSample } from '@retikz/math';

import type { PathCommand, ScenePrimitive } from '../../../contract';
import type { CanonicalPathLabel, CanonicalStep } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import type { TexLowerer, TextMeasurer } from '../../text';
import { emitLabelPrimitive } from '../host';
import { sampleStrokePathGeometry, sampleStrokeStepParameterGeometry } from './interruption';
import { sampleRoundedCommands } from './rounded-corners';

/** stroke step 的几何采样函数 */
type StrokeSegmentSampler = (t: number) => CurveSegmentSample;

/** stroke 整体路径采样输入 */
type InputStrokePathSampling = {
  /** 圆角处理后的最终路径命令 */
  commands: ReadonlyArray<PathCommand>;
  /** 按声明顺序排列的绘制段采样函数 */
  segmentSamplers: ReadonlyArray<StrokeSegmentSampler>;
  /** 是否按最终命令弧长采样；否则按绘制段数量均分 */
  roundedCommands: boolean;
  /** 从路径起点 0 到终点 1 的归一化采样位置 */
  position: number;
};

/**
 * 按整体路径位置采样 stroke 几何
 * @description 倒角后按最终 commands 弧长采样，否则沿绘制段按声明顺序均分
 */
export const sampleStrokePath = ({
  commands,
  segmentSamplers,
  roundedCommands,
  position,
}: InputStrokePathSampling): CurveSegmentSample | undefined => {
  if (segmentSamplers.length === 0) return undefined;
  if (roundedCommands) return sampleRoundedCommands(commands, position);

  const scaled = position * segmentSamplers.length;
  const segmentIndex = Math.min(Math.floor(scaled), segmentSamplers.length - 1);
  const localPosition = scaled - segmentIndex;

  return segmentSamplers[segmentIndex](position === 1 ? 1 : localPosition);
};

/** stroke step label 与 mark 采样的共享收集器 */
export type StrokeSamplingCollector = {
  /** 延迟 materialize 后的 step label Scene primitives */
  labelPrimitives: Array<ScenePrimitive>;
  /** 按声明顺序登记的绘制段采样器 */
  segmentSamplers: Array<StrokeSegmentSampler>;
  /** 登记不需要 label 处理的绘制段采样器 */
  addSampler: (sampleAt: StrokeSegmentSampler) => void;
  /** 设置后续 collect 所属的 Source Path step */
  beginStep: (sourceStepIndex: number, stepKind: CanonicalStep['kind']) => void;
  /** 登记采样器并按需延迟记录 step label */
  collect: (step: CanonicalStep, sampleAt: StrokeSegmentSampler, segmentCount?: number) => void;
  /** 在最终 command geometry 上 materialize 已登记的 step label */
  materializeStepLabels: (
    geometry: Parameters<typeof sampleStrokeStepParameterGeometry>[0],
  ) => Array<StrokeLabelMaterialization>;
  /** 取得 host label 的视觉 sample 与稳定的逻辑距离 sample */
  sampleHostLabel: (
    geometry: Parameters<typeof sampleStrokeStepParameterGeometry>[0],
    position: number,
    usesRoundedGeometry: boolean,
  ) => StrokeHostLabelSample | undefined;
};

/** 已在完整逻辑路径上 materialize 的 Stroke label */
type StrokeLabelMaterialization = {
  /** 原 canonical label */
  label: CanonicalPathLabel;
  /** 产生的 Scene primitive */
  primitive: ScenePrimitive;
  /** label 的 layout 候选点，同时作为 interruption 视觉投影范围 */
  boundsPoints: Array<IRPosition>;
  /** 原始逻辑路径上的 sample */
  sample: NonNullable<ReturnType<typeof sampleStrokeStepParameterGeometry>>;
};

/** host label 的视觉与逻辑采样对 */
type StrokeHostLabelSample = {
  /** 用于文字定位的视觉 sample。圆角路径直接使用最终逻辑几何 */
  visualSample: CurveSegmentSample;
  /** 对应真实 command occurrence 的逻辑距离 sample */
  logicalSample: NonNullable<ReturnType<typeof sampleStrokeStepParameterGeometry>>;
};

type StrokeSamplerRecord = {
  sourceStepIndex: number;
  stepKind: CanonicalStep['kind'];
  sampleAt: StrokeSegmentSampler;
  /** 当前绘制段在源 step 参数区间中的起止位置 */
  parameterRange: readonly [number, number];
};

const parameterBoundaryOwnerOfStep = (stepKind: CanonicalStep['kind']): 'previous' | 'next' =>
  stepKind === 'fold' ? 'previous' : 'next';

/** 创建 stroke sampling collector 所需的上下文 */
type InputStrokeSamplingCollector = {
  /** 追加 label 几何边界的 path bounds 数组 */
  boundsPoints: Array<IRPosition>;
  /** 文本测量函数 */
  measureText: TextMeasurer;
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** path 级 opacity，传递给 label host */
  hostOpacity: number | undefined;
  /** preset/rem 字号解析根字号 */
  rootFontSize?: number;
  /** 可选 TeX 降级能力 */
  lowerTex?: TexLowerer;
  /** path warning 收集器 */
  warn: (code: string, message: string, subPath?: PropertyPath) => void;
};

/**
 * 创建 stroke sampling collector
 * @description 始终先登记段采样器，再按 label position 生成 primitive 并把 label bounds 追加到 path bounds
 */
export const createStrokeSamplingCollector = ({
  boundsPoints,
  measureText,
  round,
  hostOpacity,
  rootFontSize,
  lowerTex,
  warn,
}: InputStrokeSamplingCollector): StrokeSamplingCollector => {
  const labelPrimitives: Array<ScenePrimitive> = [];
  const segmentSamplers: Array<StrokeSegmentSampler> = [];
  const samplerRecords: Array<StrokeSamplerRecord> = [];
  const labelRequests: Array<{
    label: CanonicalPathLabel;
    sourceStepIndex: number;
    stepKind: CanonicalStep['kind'];
  }> = [];
  let activeStepIndex = -1;
  let activeStepKind: CanonicalStep['kind'] = 'move';

  const emitLegacyLabel = (label: CanonicalPathLabel, sample: CurveSegmentSample): void => {
    const result = emitLabelPrimitive(label, sample, {
      measureText,
      round,
      rootFontSize,
      hostOpacity,
      tex: {
        lowerTex,
        gatingOn: lowerTex !== undefined,
        warn: (code, message) => warn(code, message, ['label']),
      },
    });
    labelPrimitives.push(result.primitive);
    boundsPoints.push(...result.boundsPoints);
  };

  const addSampler = (sampleAt: StrokeSegmentSampler, parameterRange: readonly [number, number] = [0, 1]): void => {
    segmentSamplers.push(sampleAt);
    samplerRecords.push({
      sourceStepIndex: activeStepIndex,
      stepKind: activeStepKind,
      sampleAt,
      parameterRange,
    });
  };

  const beginStep = (sourceStepIndex: number, stepKind: CanonicalStep['kind']): void => {
    activeStepIndex = sourceStepIndex;
    activeStepKind = stepKind;
  };

  const collect = (step: CanonicalStep, sampleAt: StrokeSegmentSampler, segmentCount = 1): void => {
    for (let index = 0; index < segmentCount; index += 1) {
      const start = index / segmentCount;
      const end = (index + 1) / segmentCount;
      addSampler(t => sampleAt(start + t * (end - start)), [start, end]);
    }
    if (step.kind === 'move' || step.kind === 'cycle' || !('label' in step) || !step.label) return;
    if (!step.label.interrupt) {
      emitLegacyLabel(step.label, sampleAt(step.label.position));
      return;
    }

    labelRequests.push({
      label: step.label,
      sourceStepIndex: activeStepIndex,
      stepKind: activeStepKind,
    });
  };

  const materializeStepLabels = (
    geometry: Parameters<typeof sampleStrokeStepParameterGeometry>[0],
  ): Array<StrokeLabelMaterialization> => {
    const materialized: Array<StrokeLabelMaterialization> = [];

    for (const request of labelRequests) {
      const sample = sampleStrokeStepParameterGeometry(
        geometry,
        request.sourceStepIndex,
        request.label.position,
        parameterBoundaryOwnerOfStep(request.stepKind),
      );
      if (sample === undefined) continue;

      const result = emitLabelPrimitive(request.label, sample.sample, {
        measureText,
        round,
        rootFontSize,
        hostOpacity,
        tex: {
          lowerTex,
          gatingOn: lowerTex !== undefined,
          warn: (code, message) => warn(code, message, ['label']),
        },
      });
      labelPrimitives.push(result.primitive);
      boundsPoints.push(...result.boundsPoints);
      materialized.push({
        label: request.label,
        primitive: result.primitive,
        boundsPoints: result.boundsPoints,
        sample,
      });
    }

    return materialized;
  };

  const sampleHostLabel = (
    geometry: Parameters<typeof sampleStrokeStepParameterGeometry>[0],
    position: number,
    usesRoundedGeometry: boolean,
  ): StrokeHostLabelSample | undefined => {
    if (usesRoundedGeometry) {
      const finalGeometrySample = sampleStrokePathGeometry(geometry, position);
      if (finalGeometrySample === undefined) return undefined;
      return { visualSample: finalGeometrySample.sample, logicalSample: finalGeometrySample };
    }

    if (samplerRecords.length === 0) return undefined;

    const scaled = position * samplerRecords.length;
    const samplerIndex = Math.min(Math.floor(scaled), samplerRecords.length - 1);
    const localPosition = position === 1 ? 1 : scaled - samplerIndex;
    const record = samplerRecords[samplerIndex];
    const stepPosition =
      record.parameterRange[0] + localPosition * (record.parameterRange[1] - record.parameterRange[0]);
    const logicalSample = sampleStrokeStepParameterGeometry(
      geometry,
      record.sourceStepIndex,
      stepPosition,
      parameterBoundaryOwnerOfStep(record.stepKind),
    );
    if (logicalSample === undefined) return undefined;

    return {
      visualSample: record.sampleAt(localPosition),
      logicalSample,
    };
  };

  return {
    labelPrimitives,
    segmentSamplers,
    addSampler,
    beginStep,
    collect,
    materializeStepLabels,
    sampleHostLabel,
  };
};
