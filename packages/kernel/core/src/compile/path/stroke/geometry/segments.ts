import type { CanonicalPathStep } from '../../../../resolve';
import type { IRPosition } from '../../../../schemas';
import { BendInAngleSchema, BendLoosenessSchema, BendOutAngleSchema } from '../../../../schemas';
import { bendControlPoints, outInControlPoints } from '../../../../shared/geometry';
import { clipTarget, foldCornersOf, isAutoBoundaryTarget, isSamePoint } from '../../target';
import type { StrokeLoweringContext } from '../types';
import type { StrokePreviousTarget } from './cursor';

/** 连接前驱目标与当前目标的普通 path segment step */
type StrokeSegmentStep = Extract<
  CanonicalPathStep,
  { kind: 'line' | 'axis-line' | 'curve' | 'cubic' | 'bend' | 'fold' }
>;

/** 普通 segment step 降级所需的共享上下文 */
type SegmentStepLoweringContext = Pick<StrokeLoweringContext, 'targetView' | 'scopeChain' | 'commandEmitter'> & {
  /** 最近一个有效目标 step */
  previous: StrokePreviousTarget;
  /** 当前 step 预解析后的目标 anchor */
  currentAnchor: IRPosition;
  /** 特殊形状留下且将由当前 segment 消费的笔位覆盖 */
  penOverride: IRPosition | null;
};

/** 判断 step 是否属于普通 segment family */
export const isStrokeSegmentStep = (canon: CanonicalPathStep): canon is StrokeSegmentStep =>
  canon.kind === 'line' ||
  canon.kind === 'axis-line' ||
  canon.kind === 'curve' ||
  canon.kind === 'cubic' ||
  canon.kind === 'bend' ||
  canon.kind === 'fold';

/**
 * 将普通 segment step 降级为 path commands
 * @returns `false` 表示 target clipping 失败，调用方应跳过整个 path
 */
export const lowerSegmentStep = (step: StrokeSegmentStep, context: SegmentStepLoweringContext): boolean => {
  const { targetView, scopeChain, previous, currentAnchor, penOverride, commandEmitter } = context;
  const targetContext = { targetView, scopeChain };

  if (step.kind === 'line') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, currentAnchor, targetContext);
    const toClip = clipTarget(step.to, penOverride ?? previous.anchor, targetContext);
    if (!fromClip || !toClip) return false;

    commandEmitter.startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    commandEmitter.emitLine(toClip, isAutoBoundaryTarget(step.to));

    return true;
  }

  if (step.kind === 'axis-line') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, currentAnchor, targetContext);
    if (!fromClip) return false;

    commandEmitter.startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    commandEmitter.emitLine(currentAnchor);

    return true;
  }

  if (step.kind === 'curve') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, step.control, targetContext);
    const toClip = clipTarget(step.to, step.control, targetContext);
    if (!fromClip || !toClip) return false;

    commandEmitter.startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    commandEmitter.emitQuad(step.control, toClip, isAutoBoundaryTarget(step.to));

    return true;
  }

  if (step.kind === 'cubic') {
    const fromClip = penOverride ?? clipTarget(previous.step.to, step.control1, targetContext);
    const toClip = clipTarget(step.to, step.control2, targetContext);
    if (!fromClip || !toClip) return false;

    commandEmitter.startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    commandEmitter.emitCubic({
      control1: step.control1,
      control2: step.control2,
      to: toClip,
      sourceAutoBoundary: isAutoBoundaryTarget(step.to),
    });

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

    commandEmitter.startSegment(fromClip, penOverride === null && isAutoBoundaryTarget(previous.step.to));
    commandEmitter.emitCubic({
      control1,
      control2,
      to: toClip,
      sourceAutoBoundary: isAutoBoundaryTarget(step.to),
    });

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

  const fromToward = points.find(candidate => !isSamePoint(candidate, points[0])) ?? currentAnchor;
  const toToward = points.findLast(candidate => !isSamePoint(candidate, points.at(-1)!)) ?? fromReference;
  const fromClip = sourceAutoBoundary
    ? points[0]
    : (penOverride ?? clipTarget(previous.step.to, fromToward, targetContext));
  const toClip = targetAutoBoundary ? points.at(-1)! : clipTarget(step.to, toToward, targetContext);
  if (!fromClip || !toClip) return false;

  points = [fromClip, ...points.slice(1, -1), toClip].filter(
    (position, index, all) => index === 0 || !isSamePoint(position, all[index - 1]),
  );
  if (points.length < 2) return true;

  commandEmitter.startSegment(points[0], sourceAutoBoundary);
  for (let index = 1; index < points.length; index += 1) {
    commandEmitter.emitLine(points[index], index === points.length - 1 && targetAutoBoundary);
  }

  return true;
};
