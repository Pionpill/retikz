import type { CurveSegmentSample } from '@retikz/math';

import type { PathCommand, ScenePrimitive } from '../../../contract';
import type { CanonicalGeometryLabel, CanonicalStep } from '../../../resolve';
import type { IRPathBase, IRPosition } from '../../../schemas';
import type { LowerTex, TextMeasurer } from '../../text';

import { emitLabelPrimitive } from '../host';
import { sampleStrokePathGeometry, sampleStrokeStepGeometry, sampleStrokeStepParameterGeometry } from './interruption';
import { sampleRoundedCommands } from './rounded-corners';

/** stroke step 的几何采样函数 */
export type StrokeSegmentSampler = (t: number) => CurveSegmentSample;

/** stroke 整体路径采样输入 */
export type SampleStrokePathInput = {
  commands: ReadonlyArray<PathCommand>;
  segmentSamplers: ReadonlyArray<StrokeSegmentSampler>;
  roundedCommands: boolean;
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
}: SampleStrokePathInput): CurveSegmentSample | undefined => {
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
  collect: (step: CanonicalStep, sampleAt: StrokeSegmentSampler) => void;
  /** 在最终 command geometry 上 materialize 已登记的 step label */
  materializeStepLabels: (
    geometry: Parameters<typeof sampleStrokeStepGeometry>[0],
  ) => Array<StrokeLabelMaterialization>;
  /** 取得 host label 的视觉 sample 与稳定的逻辑距离 sample */
  sampleHostLabel: (
    geometry: Parameters<typeof sampleStrokeStepGeometry>[0],
    position: number,
    usesRoundedGeometry: boolean,
  ) => StrokeHostLabelSample | undefined;
};

/** 已在完整逻辑路径上 materialize 的 Stroke label */
export type StrokeLabelMaterialization = {
  /** 原 canonical label */
  label: CanonicalGeometryLabel;
  /** 产生的 Scene primitive */
  primitive: ScenePrimitive;
  /** label 的 layout 候选点，同时作为 interruption 视觉投影范围 */
  boundsPoints: Array<IRPosition>;
  /** 原始逻辑路径上的 sample */
  sample: NonNullable<ReturnType<typeof sampleStrokeStepGeometry>>;
};

/** host label 的视觉与逻辑采样对 */
export type StrokeHostLabelSample = {
  /** 用于文字定位的视觉 sample。圆角路径直接使用最终逻辑几何 */
  visualSample: CurveSegmentSample;
  /** 对应真实 command occurrence 的逻辑距离 sample */
  logicalSample: NonNullable<ReturnType<typeof sampleStrokeStepGeometry>>;
};

type StrokeSamplingMode = 'distance' | 'parameter';

type StrokeSamplerRecord = {
  sourceStepIndex: number;
  stepKind: CanonicalStep['kind'];
  mode: StrokeSamplingMode;
  sampleAt: StrokeSegmentSampler;
};

const parameterBoundaryOwnerOfStep = (stepKind: CanonicalStep['kind']): 'previous' | 'next' =>
  stepKind === 'fold' ? 'previous' : 'next';

/** 创建 stroke sampling collector 所需的上下文 */
export type CreateStrokeSamplingCollectorInput = {
  /** 追加 label 几何边界的 path bounds 数组 */
  boundsPoints: Array<IRPosition>;
  /** 文本测量函数 */
  measureText: TextMeasurer;
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** path 级 opacity，传递给 label host */
  hostOpacity: IRPathBase['opacity'];
  /** preset/rem 字号解析根字号 */
  rootFontSize?: number;
  /** 可选 TeX 降级能力 */
  lowerTex?: LowerTex;
  /** path warning 收集器 */
  warn: (code: string, message: string, subPath?: string) => void;
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
}: CreateStrokeSamplingCollectorInput): StrokeSamplingCollector => {
  const labelPrimitives: Array<ScenePrimitive> = [];
  const segmentSamplers: Array<StrokeSegmentSampler> = [];
  const samplerRecords: Array<StrokeSamplerRecord> = [];
  const labelRequests: Array<{
    label: CanonicalGeometryLabel;
    sourceStepIndex: number;
    stepKind: CanonicalStep['kind'];
    mode: StrokeSamplingMode;
  }> = [];
  let activeStepIndex = -1;
  let activeStepKind: CanonicalStep['kind'] = 'move';
  let activeSamplingMode: StrokeSamplingMode = 'parameter';

  const emitLegacyLabel = (label: CanonicalGeometryLabel, sample: CurveSegmentSample): void => {
    const result = emitLabelPrimitive(label, sample, {
      measureText,
      round,
      rootFontSize,
      hostOpacity,
      tex: {
        lowerTex,
        gatingOn: lowerTex !== undefined,
        warn: (code, message) => warn(code, message, 'label'),
      },
    });
    labelPrimitives.push(result.primitive);
    boundsPoints.push(...result.boundsPoints);
  };

  const addSampler = (sampleAt: StrokeSegmentSampler): void => {
    segmentSamplers.push(sampleAt);
    samplerRecords.push({
      sourceStepIndex: activeStepIndex,
      stepKind: activeStepKind,
      mode: activeSamplingMode,
      sampleAt,
    });
  };

  const beginStep = (sourceStepIndex: number, stepKind: CanonicalStep['kind']): void => {
    activeStepIndex = sourceStepIndex;
    activeStepKind = stepKind;
    activeSamplingMode = stepKind === 'generator' ? 'distance' : 'parameter';
  };

  const collect = (step: CanonicalStep, sampleAt: StrokeSegmentSampler): void => {
    addSampler(sampleAt);
    if (step.kind === 'move' || step.kind === 'cycle' || !('label' in step) || !step.label) return;
    if (!step.label.interrupt) {
      emitLegacyLabel(step.label, sampleAt(step.label.position));
      return;
    }
    labelRequests.push({
      label: step.label,
      sourceStepIndex: activeStepIndex,
      stepKind: activeStepKind,
      mode: activeSamplingMode,
    });
  };

  const materializeStepLabels = (
    geometry: Parameters<typeof sampleStrokeStepGeometry>[0],
  ): Array<StrokeLabelMaterialization> => {
    const materialized: Array<StrokeLabelMaterialization> = [];
    for (const request of labelRequests) {
      const sample =
        request.mode === 'distance'
          ? sampleStrokeStepGeometry(geometry, request.sourceStepIndex, request.label.position)
          : sampleStrokeStepParameterGeometry(
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
          warn: (code, message) => warn(code, message, 'label'),
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
    geometry: Parameters<typeof sampleStrokeStepGeometry>[0],
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
    const logicalSample =
      record.mode === 'distance'
        ? sampleStrokeStepGeometry(geometry, record.sourceStepIndex, localPosition)
        : sampleStrokeStepParameterGeometry(
            geometry,
            record.sourceStepIndex,
            localPosition,
            parameterBoundaryOwnerOfStep(record.stepKind),
          );
    if (logicalSample === undefined) return undefined;
    return {
      visualSample: record.mode === 'distance' ? logicalSample.sample : record.sampleAt(localPosition),
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
