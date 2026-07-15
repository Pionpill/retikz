import type { ScenePrimitive } from '../../../contract';
import type { IRPathBase, IRPosition, IRStep } from '../../../schemas';
import type { SegmentSample } from '../../../shared/geometry';
import type { LowerTex, TextMeasurer } from '../../text';

import { emitLabelPrimitive, tForLabelPosition } from '../host/label';

/** stroke step 的几何采样函数 */
export type StrokeSegmentSampler = (t: number) => SegmentSample;

/** stroke step label 与 mark 采样的共享收集器 */
export type StrokeSamplingCollector = {
  /** step label 编译出的同级 Scene primitives */
  labelPrimitives: Array<ScenePrimitive>;
  /** 按声明顺序登记的绘制段采样器 */
  segmentSamplers: Array<StrokeSegmentSampler>;
  /** 登记不需要 label 处理的绘制段采样器 */
  addSampler: (sampleAt: StrokeSegmentSampler) => void;
  /** 登记采样器并按需编译 step label */
  collect: (step: IRStep, sampleAt: StrokeSegmentSampler) => void;
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

  const collect = (step: IRStep, sampleAt: StrokeSegmentSampler): void => {
    addSampler(sampleAt);
    if (step.kind === 'move' || step.kind === 'cycle' || !('label' in step) || !step.label) return;

    const sample = sampleAt(tForLabelPosition(step.label.position));
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
