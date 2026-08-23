import type { PathCommand, ScenePrimitive } from '../../../contract';
import type { CanonicalStep } from '../../../resolve';
import type { IRPathBase, IRPosition } from '../../../schemas';
import type { SegmentSample } from '../../../shared/geometry';
import type { LowerTex, TextMeasurer } from '../../text';

import { emitLabelPrimitive } from '../host';
import { sampleRoundedCommands } from './rounded-corners';

/** stroke step 的几何采样函数 */
export type StrokeSegmentSampler = (t: number) => SegmentSample;

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
}: SampleStrokePathInput): SegmentSample | undefined => {
  if (segmentSamplers.length === 0) return undefined;
  if (roundedCommands) return sampleRoundedCommands(commands, position);
  const scaled = position * segmentSamplers.length;
  const segmentIndex = Math.min(Math.floor(scaled), segmentSamplers.length - 1);
  const localPosition = scaled - segmentIndex;
  return segmentSamplers[segmentIndex](position === 1 ? 1 : localPosition);
};

/** stroke step label 与 mark 采样的共享收集器 */
export type StrokeSamplingCollector = {
  /** step label 编译出的同级 Scene primitives */
  labelPrimitives: Array<ScenePrimitive>;
  /** 按声明顺序登记的绘制段采样器 */
  segmentSamplers: Array<StrokeSegmentSampler>;
  /** 登记不需要 label 处理的绘制段采样器 */
  addSampler: (sampleAt: StrokeSegmentSampler) => void;
  /** 登记采样器并按需编译 step label */
  collect: (step: CanonicalStep, sampleAt: StrokeSegmentSampler) => void;
};

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

  const addSampler = (sampleAt: StrokeSegmentSampler): void => {
    segmentSamplers.push(sampleAt);
  };

  const collect = (step: CanonicalStep, sampleAt: StrokeSegmentSampler): void => {
    addSampler(sampleAt);
    if (step.kind === 'move' || step.kind === 'cycle' || !('label' in step) || !step.label) return;

    const sample = sampleAt(step.label.position);
    const result = emitLabelPrimitive(step.label, sample, {
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

  return { labelPrimitives, segmentSamplers, addSampler, collect };
};
