import type { CurveSegment, CurveSegmentSample } from '@retikz/math';
import { curve } from '@retikz/math';

import type { CanonicalPathStep } from '../../../../resolve';
import type { IRPosition } from '../../../../schemas';
import { foldSegmentSample, rectPerimeterSample } from '../../../../shared/geometry';

/** 原始步骤的纯数据参数模型，保留未舍入几何及各步骤的参数归属 */
export type StrokeSamplingSource =
  | CurveSegment
  | { kind: 'fold'; points: Array<IRPosition> }
  | { kind: 'rectangle'; from: IRPosition; to: IRPosition }
  | { kind: 'smooth'; segments: Array<CurveSegment> };

/** 一条绘制段对应的原始步骤参数区间 */
export type StrokeSamplerRecord = {
  /** 来源步骤下标 */
  sourceStepIndex: number;
  /** 来源步骤种类 */
  stepKind: CanonicalPathStep['kind'];
  /** 原始步骤的未舍入参数模型 */
  source: StrokeSamplingSource;
  /** 此记录在原始步骤参数中的范围 */
  parameterRange: readonly [number, number];
};

/** 使用原始步骤参数模型定位，不读取当前标签或运行时查询环境 */
export const sampleStrokeSource = (source: StrokeSamplingSource, parameter: number): CurveSegmentSample => {
  if (source.kind === 'fold')
    return foldSegmentSample(source.points[0], source.points.slice(1, -1), source.points.at(-1)!, parameter);
  if (source.kind === 'rectangle') return rectPerimeterSample(source.from, source.to, parameter);
  if (source.kind === 'smooth') {
    const scaled = parameter * source.segments.length;
    const index = Math.min(Math.floor(scaled), source.segments.length - 1);
    return curve.sampleAt(source.segments[index], parameter === 1 ? 1 : scaled - index);
  }
  return curve.sampleAt(source, parameter);
};

/** 同次几何降级的收集器，输出纯数据，不保留标签请求或采样闭包 */
export class StrokeSamplingCollector {
  /** 按绘制顺序保存参数模型和区间 */
  readonly samplerRecords: Array<StrokeSamplerRecord> = [];
  /** 当前来源步骤下标 */
  private activeStepIndex = -1;
  /** 当前来源步骤种类 */
  private activeStepKind: CanonicalPathStep['kind'] = 'move';

  /** 设置后续记录的来源步骤 */
  beginStep(sourceStepIndex: number, stepKind: CanonicalPathStep['kind']): void {
    this.activeStepIndex = sourceStepIndex;
    this.activeStepKind = stepKind;
  }

  /** 追加一个步骤参数模型 */
  addSampler(source: StrokeSamplingSource, parameterRange: readonly [number, number] = [0, 1]): void {
    this.samplerRecords.push({
      sourceStepIndex: this.activeStepIndex,
      stepKind: this.activeStepKind,
      source,
      parameterRange,
    });
  }

  /** 按步骤实际生成的段数分配参数范围 */
  collect(source: StrokeSamplingSource, segmentCount = 1): void {
    for (let index = 0; index < segmentCount; index += 1)
      this.addSampler(source, [index / segmentCount, (index + 1) / segmentCount]);
  }
}
