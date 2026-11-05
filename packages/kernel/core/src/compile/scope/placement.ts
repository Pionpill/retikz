import type { Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRPosition, IRScopeSelfPoint, IRTransform } from '../../schemas';
import { projectLayoutWithTransform, evaluateAnchorReference } from '../node';
import type { CompiledBoundaryGeometry } from '../reference';
import { BuiltinCompileWarningCode, applyTransformChain, composeScopeTransform } from '../shared';
import { lowerScopeTransforms } from './transform';
import type { InputScopeCompile, ScopeCompileContext } from './types';

/** 按 transform 失败来源选择 warning code */
const getTransformWarningCode = (failed: IRTransform | undefined): BuiltinCompileWarningCode => {
  switch (failed?.kind) {
    case 'offset-translate':
      return BuiltinCompileWarningCode.OffsetBaseUnresolved;
    case 'at-translate':
      return BuiltinCompileWarningCode.AtTargetUnresolved;
    case 'polar-translate':
      return BuiltinCompileWarningCode.PolarOriginUnresolved;
    default:
      return BuiltinCompileWarningCode.UnresolvedNodeReference;
  }
};

/** 拒绝非 finite 的 Scope position 中间结果 */
const assertFiniteScopePoint = (point: IRPosition, label: string): void => {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `${label} must resolve to a finite point`);
  }
};

/** anchor position self point：anchor 在 transformed envelope 上解析；origin / 显式点先按 own chain 投影 */
const evaluateTransformedSelfPoint = (
  point: IRScopeSelfPoint,
  transformedContext: CompiledBoundaryGeometry,
  scopeTransforms: ReadonlyArray<Transform>,
): IRPosition => {
  if (typeof point === 'string') {
    if (point !== 'origin') {
      const finitePoint: IRPosition = evaluateAnchorReference(transformedContext, point);
      assertFiniteScopePoint(finitePoint, 'scope position selfAnchor');
      return finitePoint;
    }

    const finitePoint: IRPosition = applyTransformChain([0, 0], scopeTransforms);
    assertFiniteScopePoint(finitePoint, 'scope position selfAnchor');
    return finitePoint;
  }

  if (Array.isArray(point)) {
    const finitePoint: IRPosition = applyTransformChain([point[0], point[1]], scopeTransforms);
    assertFiniteScopePoint(finitePoint, 'scope position selfAnchor');
    return finitePoint;
  }

  const finitePoint: IRPosition = evaluateAnchorReference(transformedContext, point);
  assertFiniteScopePoint(finitePoint, 'scope position selfAnchor');
  return finitePoint;
};

/** children intrinsic layout 完成后解析 pivot，并生成最终 own chain */
export const lowerScopePlacementTransforms = (
  child: InputScopeCompile,
  context: Pick<ScopeCompileContext, 'positionContext' | 'irPath' | 'onWarn'>,
  intrinsicContext: CompiledBoundaryGeometry,
  positionTarget: IRPosition | undefined,
  preliminaryTransforms: Array<Transform> | undefined,
): Array<Transform> => {
  const scopeIrPath = context.irPath;
  let failedTransform: IRTransform | undefined;
  const loweredOwn =
    preliminaryTransforms ??
    lowerScopeTransforms(child.transforms ?? [], {
      positionContext: context.positionContext,
      intrinsicContext,
      onUnresolved: transform => {
        failedTransform = transform;
      },
    });
  if (loweredOwn === null) {
    context.onWarn({
      code: getTransformWarningCode(failedTransform),
      message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
      path: [...scopeIrPath, 'transforms'],
    });
  }

  const scopeTransforms = loweredOwn ?? [];
  if (Array.isArray(child.position)) {
    if (preliminaryTransforms !== undefined) return scopeTransforms;
    const [x, y] = child.position;
    return x === 0 && y === 0 ? scopeTransforms : [{ kind: 'translate', x, y }, ...scopeTransforms];
  }
  if (positionTarget === undefined) return scopeTransforms;

  const transformedContext =
    scopeTransforms.length === 0
      ? intrinsicContext
      : projectLayoutWithTransform(intrinsicContext, composeScopeTransform(scopeTransforms));
  const selfPoint = evaluateTransformedSelfPoint(
    (!Array.isArray(child.position) ? child.position?.selfAnchor : undefined) ?? 'center',
    transformedContext,
    scopeTransforms,
  );
  const alignment: Transform = {
    kind: 'translate',
    x: positionTarget[0] - selfPoint[0],
    y: positionTarget[1] - selfPoint[1],
  };
  assertFiniteScopePoint([alignment.x, alignment.y], 'scope position');

  return [alignment, ...scopeTransforms];
};

/**
 * 不依赖 intrinsic envelope 的既有 transform 可在 children 前冻结
 * @description 保持 v0.4 Scope transform 下跨 frame relative 定位语义；anchor pivot 才进入完整两阶段收尾
 */
export const lowerPreliminaryScopeTransforms = (
  child: InputScopeCompile,
  context: Pick<ScopeCompileContext, 'positionContext' | 'irPath' | 'onWarn'>,
): Array<Transform> | undefined => {
  const needsIntrinsicEnvelope = (child.transforms ?? []).some(transform => {
    if (transform.kind !== 'rotate' && transform.kind !== 'scale') return false;
    const pivot = transform.pivot;
    return pivot !== undefined && pivot !== 'origin' && !Array.isArray(pivot);
  });
  if (needsIntrinsicEnvelope) return undefined;

  let failedTransform: IRTransform | undefined;
  const transforms = lowerScopeTransforms(child.transforms ?? [], {
    positionContext: context.positionContext,
    onUnresolved: transform => {
      failedTransform = transform;
    },
  });
  if (transforms !== null) {
    if (Array.isArray(child.position)) {
      const [x, y] = child.position;
      if (x !== 0 || y !== 0) return [{ kind: 'translate', x, y }, ...transforms];
    }
    return transforms;
  }

  context.onWarn({
    code: getTransformWarningCode(failedTransform),
    message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
    path: [...context.irPath, 'transforms'],
  });

  return Array.isArray(child.position) && (child.position[0] !== 0 || child.position[1] !== 0)
    ? [{ kind: 'translate', x: child.position[0], y: child.position[1] }]
    : [];
};
