import { isFinitePoint } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../../error';
import type { CanonicalPathStep } from '../../../../resolve';
import type { IRPosition, IRTarget } from '../../../../schemas';
import { isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../../../shared';
import { pointOfTarget } from '../../target';
import type { StrokeLoweringContext } from '../types';
import { isStrokeTargetStep } from './helpers';

/** 根据当前游标基线求值相对目标，并更新后续步骤使用的基线 */
export const evaluateStrokeStep = (
  step: CanonicalPathStep,
  originalStep: CanonicalPathStep,
  index: number,
  context: Pick<StrokeLoweringContext, 'cursor' | 'targetView' | 'scopeChain'>,
): CanonicalPathStep => {
  const { cursor, targetView, scopeChain } = context;
  if (cursor.relativeBaseline === null) return step;
  if (
    isStrokeTargetStep(step) &&
    'to' in originalStep &&
    (isRelativeTargetLike(originalStep.to) || isRelativeAccumulateTargetLike(originalStep.to))
  ) {
    const offset = isRelativeTargetLike(originalStep.to)
      ? originalStep.to.relative
      : originalStep.to.relativeAccumulate;
    const resolved: IRPosition = [cursor.relativeBaseline[0] + offset[0], cursor.relativeBaseline[1] + offset[1]];
    if (!isFinitePoint(resolved)) {
      throw new RetikzCoreError(RetikzCoreErrorCode.Compile, 'Relative target produced a non-finite endpoint.');
    }

    const resolvedStep = { ...step, to: resolved };
    cursor.setTargetAt(index, resolvedStep, resolved);
    step = resolvedStep;
    if (isRelativeAccumulateTargetLike(originalStep.to)) {
      cursor.relativeBaseline = resolved;
    }
  }

  if (
    isStrokeTargetStep(step) &&
    step.kind !== 'axis-line' &&
    'to' in originalStep &&
    !isRelativeTargetLike(originalStep.to) &&
    !isRelativeAccumulateTargetLike(originalStep.to)
  ) {
    const absoluteAnchor = cursor.anchorAt(index);
    if (absoluteAnchor) cursor.relativeBaseline = absoluteAnchor;
  }

  if (step.kind === 'smooth' && originalStep.kind === 'smooth') {
    let smoothBaseline: IRPosition = cursor.relativeBaseline;
    const points: Array<IRTarget> = [];

    for (const originalPoint of originalStep.points) {
      if (isRelativeTargetLike(originalPoint)) {
        const resolved: IRPosition = [
          smoothBaseline[0] + originalPoint.relative[0],
          smoothBaseline[1] + originalPoint.relative[1],
        ];
        if (!isFinitePoint(resolved))
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Compile,
            'Smooth relative target produced a non-finite endpoint.',
          );

        points.push(resolved);
        continue;
      }

      if (isRelativeAccumulateTargetLike(originalPoint)) {
        const resolved: IRPosition = [
          smoothBaseline[0] + originalPoint.relativeAccumulate[0],
          smoothBaseline[1] + originalPoint.relativeAccumulate[1],
        ];
        if (!isFinitePoint(resolved)) {
          throw new RetikzCoreError(
            RetikzCoreErrorCode.Compile,
            'Smooth relativeAccumulate target produced a non-finite endpoint.',
          );
        }

        points.push(resolved);
        smoothBaseline = resolved;
        continue;
      }

      const resolved = pointOfTarget(originalPoint, targetView, scopeChain);
      if (!resolved) {
        points.push(originalPoint);
        continue;
      }

      points.push(originalPoint);
      smoothBaseline = resolved;
    }

    step = { ...step, points };
    cursor.relativeBaseline = smoothBaseline;
  }

  return step;
};
