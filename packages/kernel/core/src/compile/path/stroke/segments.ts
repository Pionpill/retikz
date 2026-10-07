import { curve } from '@retikz/math';

import type { Transform } from '../../../contract';
import type { CanonicalStep, PathTargetView } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import { BendOutAngleSchema, BendInAngleSchema, BendLoosenessSchema } from '../../../schemas';
import { bendControlPoints, foldSegmentSample, outInControlPoints } from '../../../shared/geometry';
import { clipTarget, foldCornersOf, isAutoBoundaryTarget, samePoint } from '../host';
import type { PathCommandEmitter } from './commands';
import type { StrokePreviousTarget } from './cursor';
import type { StrokeSamplingCollector } from './sampling';

/** 连接前驱目标与当前目标的普通 path segment step */
export type StrokeSegmentStep = Extract<
  CanonicalStep,
  { kind: 'line' | 'axis-line' | 'curve' | 'cubic' | 'bend' | 'fold' }
>;

/** 普通 segment step 降级所需的共享上下文 */
export type LowerSegmentStepContext = {
  /** resolving 阶段绑定的 target view */
  targetView: PathTargetView;
  /** 当前 scope 的累计变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** 最近一个有效目标 step */
  previous: StrokePreviousTarget;
  /** 当前 step 预解析后的目标 anchor */
  currentAnchor: IRPosition;
  /** 特殊形状留下且将由当前 segment 消费的笔位覆盖 */
  penOverride: IRPosition | null;
  /** path command 写入器 */
  commandEmitter: PathCommandEmitter;
  /** label 与 mark 采样收集器 */
  sampling: StrokeSamplingCollector;
};

/** 判断 step 是否属于普通 segment family */
export const isStrokeSegmentStep = (step: CanonicalStep): step is StrokeSegmentStep =>
  step.kind === 'line' ||
  step.kind === 'axis-line' ||
  step.kind === 'curve' ||
  step.kind === 'cubic' ||
  step.kind === 'bend' ||
  step.kind === 'fold';

/**
 * 将普通 segment step 降级为 path commands
 * @returns `false` 表示 target clipping 失败，调用方应跳过整个 path
 */
export const lowerSegmentStep = (step: StrokeSegmentStep, context: LowerSegmentStepContext): boolean => {
  const { targetView, scopeChain, previous, currentAnchor, penOverride, commandEmitter, sampling } = context;
  const { emitLine, emitQuad, emitCubic, startSegment } = commandEmitter;
  const targetContext = { targetView, scopeChain };

  if (step.kind === 'line') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, currentAnchor, targetContext);
    const toClip = clipTarget(step.to, penOverride ?? previous.anchor, targetContext);
    if (!fromClip || !toClip) return false;

    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitLine(toClip, isAutoBoundaryTarget(step.to));
    sampling.collect(step, t => curve.sampleAt({ kind: 'line', from: fromClip, to: toClip }, t));

    return true;
  }

  if (step.kind === 'axis-line') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, currentAnchor, targetContext);
    if (!fromClip) return false;

    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitLine(currentAnchor);
    sampling.collect(step, t => curve.sampleAt({ kind: 'line', from: fromClip, to: currentAnchor }, t));

    return true;
  }

  if (step.kind === 'curve') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, step.control, targetContext);
    const toClip = clipTarget(step.to, step.control, targetContext);
    if (!fromClip || !toClip) return false;

    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitQuad(step.control, toClip, isAutoBoundaryTarget(step.to));
    sampling.collect(step, t =>
      curve.sampleAt({ kind: 'quadraticBezier', from: fromClip, control: step.control, to: toClip }, t),
    );

    return true;
  }

  if (step.kind === 'cubic') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, step.control1, targetContext);
    const toClip = clipTarget(step.to, step.control2, targetContext);
    if (!fromClip || !toClip) return false;

    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitCubic({
      control1: step.control1,
      control2: step.control2,
      to: toClip,
      sourceAutoBoundary: isAutoBoundaryTarget(step.to),
    });
    sampling.collect(step, t =>
      curve.sampleAt(
        { kind: 'cubicBezier', from: fromClip, control1: step.control1, control2: step.control2, to: toClip },
        t,
      ),
    );

    return true;
  }

  if (step.kind === 'bend') {
    const fromReference = penOverride ?? previous.anchor;
    const [control1, control2] =
      step.outAngle !== undefined || step.inAngle !== undefined
        ? outInControlPoints(
            fromReference,
            currentAnchor,
            step.outAngle ?? BendOutAngleSchema.parse(undefined),
            step.inAngle ?? BendInAngleSchema.parse(undefined),
            step.looseness ?? BendLoosenessSchema.parse(undefined),
          )
        : bendControlPoints(fromReference, currentAnchor, step.bendDirection, step.bendAngle);
    const fromClip = penOverride ?? clipTarget(previous.step.to, control1, targetContext);
    const toClip = clipTarget(step.to, control2, targetContext);
    if (!fromClip || !toClip) return false;

    startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    emitCubic({
      control1,
      control2,
      to: toClip,
      sourceAutoBoundary: isAutoBoundaryTarget(step.to),
    });
    sampling.collect(step, t =>
      curve.sampleAt({ kind: 'cubicBezier', from: fromClip, control1, control2, to: toClip }, t),
    );

    return true;
  }

  const fromReference = penOverride ?? previous.anchor;
  const corners =
    step.via === '-|-' || step.via === '|-|'
      ? foldCornersOf(fromReference, currentAnchor, step.via, step.fraction)
      : foldCornersOf(fromReference, currentAnchor, step.via);
  let points = [fromReference, ...corners, currentAnchor];
  const sourceAutoBoundary = penOverride === null && isAutoBoundaryTarget(previous.step.to);
  const targetAutoBoundary = isAutoBoundaryTarget(step.to);

  if (sourceAutoBoundary) points = targetView.clipPolylineTarget(previous.step.to, points, scopeChain);
  if (targetAutoBoundary) points = targetView.clipPolylineTarget(step.to, points.toReversed(), scopeChain).reverse();
  if (points.length === 0) return true;

  const fromToward = points.find(candidate => !samePoint(candidate, points[0])) ?? currentAnchor;
  const toToward = points.findLast(candidate => !samePoint(candidate, points.at(-1)!)) ?? fromReference;
  const fromClip = sourceAutoBoundary
    ? points[0]
    : (penOverride ?? clipTarget(previous.step.to, fromToward, targetContext));
  const toClip = targetAutoBoundary ? points.at(-1)! : clipTarget(step.to, toToward, targetContext);
  if (!fromClip || !toClip) return false;

  points = [fromClip, ...points.slice(1, -1), toClip].filter(
    (position, index, all) => index === 0 || !samePoint(position, all[index - 1]),
  );
  if (points.length < 2) return true;

  startSegment(points[0], sourceAutoBoundary);
  for (let index = 1; index < points.length; index += 1) {
    emitLine(points[index], index === points.length - 1 && targetAutoBoundary);
  }
  sampling.collect(step, t =>
    points.length === 2
      ? curve.sampleAt({ kind: 'line', from: points[0], to: points[1] }, t)
      : foldSegmentSample(points[0], points.slice(1, -1), points.at(-1)!, t),
  );

  return true;
};
