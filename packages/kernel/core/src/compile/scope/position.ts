import { formatPropertyPath } from '@retikz/foundation';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { createLayoutProbeRecoverableError } from '../../resolve';
import type { IRPosition, IRScope, IRScopePositionTarget } from '../../schemas';
import { evaluatePositionTargetWorld } from '../reference';
import type { ScopeCompileContext } from './types';

/** 拒绝引用适配返回的非有限位置 */
const assertFiniteScopePoint = (point: IRPosition, label: string): void => {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `${label} must resolve to a finite point`);
  }
};

/**
 * 在 children 编译前冻结 Scope position target
 * @description 只允许父 frame 显式坐标或此前已完成的 namespace entry，避免 descendant / self / placeholder cycle
 */
export const evaluateScopePositionTarget = (
  child: Pick<IRScope, 'position' | 'id'>,
  context: Pick<ScopeCompileContext, 'positionContext' | 'irPath'>,
): IRPosition | undefined => {
  const target: IRScopePositionTarget | undefined = Array.isArray(child.position) ? undefined : child.position?.target;
  if (target === undefined) return undefined;
  if (Array.isArray(target)) {
    const finitePoint: IRPosition = [target[0], target[1]];
    assertFiniteScopePoint(finitePoint, 'scope position target');
    return finitePoint;
  }

  const scopeIrPath = context.irPath;
  if (target.id === child.id) {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve scope position target '${target.id}' at ${formatPropertyPath(scopeIrPath)}: self target is not allowed`,
    );
  }

  const positionContext = context.positionContext;
  const reference = positionContext.lookupReference(target.id, 'position');
  if (reference === undefined || reference.state !== 'resolved') {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve scope position target '${target.id}' at ${formatPropertyPath(scopeIrPath)}: target must be defined and fully resolved before this Scope`,
    );
  }

  const resolution = evaluatePositionTargetWorld(target, positionContext);
  if (resolution.referencePoint === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve scope position target '${target.id}' at ${formatPropertyPath(scopeIrPath)}`,
    );
  }

  const finitePoint: IRPosition = positionContext.toLocal(resolution.referencePoint);
  assertFiniteScopePoint(finitePoint, 'scope position target');
  return finitePoint;
};
