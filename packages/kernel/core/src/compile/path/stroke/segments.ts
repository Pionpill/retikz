import { isFinitePoint } from '@retikz/math';

import type { Transform } from '../../../contract';
import type { IRPosition, IRStep } from '../../../schemas';
import type { NamespaceStack } from '../../namespace';
import type { PathCommandEmitter } from './commands';
import type { StrokePreviousTarget } from './cursor';
import type { StrokeSamplingCollector } from './sampling';

import {
  bendControlPoints,
  cubicSegmentSample,
  foldSegmentSample,
  lineSegmentSample,
  outInControlPoints,
  quadSegmentSample,
} from '../../../shared/geometry';
import { clipForTarget, cornerOf, isAutoBoundaryTarget } from '../host/target';

/** 连接前驱目标与当前目标的普通 path segment step */
export type StrokeSegmentStep = Extract<IRStep, { kind: 'line' | 'curve' | 'cubic' | 'bend' | 'fold' }>;

/** 普通 segment step 降级所需的共享上下文 */
export type LowerSegmentStepContext = {
  /** id 查询栈 */
  namespaceStack: NamespaceStack;
  /** 当前 scope 的累积变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** 最近一个有效目标 step */
  previous: StrokePreviousTarget;
  /** 当前 step 预解析后的目标 anchor */
  currentAnchor: IRPosition;
  /** 特殊形状留下且已被当前 segment 消费的笔位覆盖 */
  penOverride: IRPosition | null;
  /** path command 写入器 */
  commandEmitter: PathCommandEmitter;
  /** label 与 mark 采样收集器 */
  sampling: StrokeSamplingCollector;
};

/** 判断 step 是否属于普通 segment family */
export const isStrokeSegmentStep = (step: IRStep): step is StrokeSegmentStep =>
  step.kind === 'line' ||
  step.kind === 'curve' ||
  step.kind === 'cubic' ||
  step.kind === 'bend' ||
  step.kind === 'fold';

/**
 * 将普通 segment step 降级到 path commands
 * @returns `false` 表示 target clipping 失败，调用方应跳过整个 path
 */
export const lowerSegmentStep = (step: StrokeSegmentStep, context: LowerSegmentStepContext): boolean => {
  const { namespaceStack, scopeChain, previous, currentAnchor, penOverride, commandEmitter, sampling } = context;
  const { emitLine, emitQuad, emitCubic, startSegment } = commandEmitter;
  const targetContext = { namespaceStack, scopeChain };

  if (step.kind === 'line') {
    const fromClip = penOverride ?? clipForTarget(previous.step.to, currentAnchor, targetContext);
    const toClip = clipForTarget(step.to, penOverride ?? previous.anchor, targetContext);
    if (!fromClip || !toClip) return false;
    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitLine(toClip, isAutoBoundaryTarget(step.to));
    sampling.collect(step, t => lineSegmentSample(fromClip, toClip, t));
    return true;
  }

  if (step.kind === 'curve') {
    const fromClip = penOverride ?? clipForTarget(previous.step.to, step.control, targetContext);
    const toClip = clipForTarget(step.to, step.control, targetContext);
    if (!fromClip || !toClip) return false;
    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitQuad(step.control, toClip, isAutoBoundaryTarget(step.to));
    sampling.collect(step, t => quadSegmentSample(fromClip, step.control, toClip, t));
    return true;
  }

  if (step.kind === 'cubic') {
    const fromClip = penOverride ?? clipForTarget(previous.step.to, step.control1, targetContext);
    const toClip = clipForTarget(step.to, step.control2, targetContext);
    if (!fromClip || !toClip) return false;
    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitCubic({
      control1: step.control1,
      control2: step.control2,
      to: toClip,
      sourceAutoBoundary: isAutoBoundaryTarget(step.to),
    });
    sampling.collect(step, t => cubicSegmentSample(fromClip, step.control1, step.control2, toClip, t));
    return true;
  }

  if (step.kind === 'bend') {
    const fromReference = penOverride ?? previous.anchor;
    const [control1, control2] =
      step.outAngle !== undefined || step.inAngle !== undefined
        ? outInControlPoints(fromReference, currentAnchor, step.outAngle ?? 0, step.inAngle ?? 180, step.looseness)
        : bendControlPoints(fromReference, currentAnchor, step.bendDirection ?? 'left', step.bendAngle ?? 30);
    if (!isFinitePoint(control1) || !isFinitePoint(control2)) {
      throw new Error('Bend produced a non-finite control point (looseness / angle too large); use smaller values.');
    }
    const fromClip = penOverride ?? clipForTarget(previous.step.to, control1, targetContext);
    const toClip = clipForTarget(step.to, control2, targetContext);
    if (!fromClip || !toClip) return false;
    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitCubic({
      control1,
      control2,
      to: toClip,
      sourceAutoBoundary: isAutoBoundaryTarget(step.to),
    });
    sampling.collect(step, t => cubicSegmentSample(fromClip, control1, control2, toClip, t));
    return true;
  }

  const corner = cornerOf(penOverride ?? previous.anchor, currentAnchor, step.via);
  const fromClip = penOverride ?? clipForTarget(previous.step.to, corner, targetContext);
  const toClip = clipForTarget(step.to, corner, targetContext);
  if (!fromClip || !toClip) return false;
  startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
  emitLine(corner);
  emitLine(toClip, isAutoBoundaryTarget(step.to));
  sampling.collect(step, t => foldSegmentSample(fromClip, corner, toClip, t));
  return true;
};
