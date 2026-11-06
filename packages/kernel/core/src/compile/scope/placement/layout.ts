import type { Transform } from '../../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { IRPosition, IRScopeSelfPoint, IRTransform } from '../../../schemas';
import { projectLayoutWithTransform, evaluateAnchorReference } from '../../boundary';
import type { CompiledBoundaryGeometry } from '../../boundary';
import { BuiltinCompileWarningCode, applyTransformChain, composeScopeTransform } from '../../shared';
import type { InputScopeCompile, ScopeCompileContext, ScopePlacementPreparation } from '../types';
import { evaluateScopePositionTarget } from './position';
import { lowerScopeTransforms } from './transform';

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
  intrinsicContext: CompiledBoundaryGeometry,
  scopeTransforms: ReadonlyArray<Transform>,
): IRPosition => {
  let finitePoint: IRPosition;
  // ⚡原点和显式self点只需逐项变换，包络锚点才合成矩阵并投影整个几何
  if (point === 'origin') finitePoint = applyTransformChain([0, 0], scopeTransforms);
  else if (Array.isArray(point)) finitePoint = applyTransformChain([point[0], point[1]], scopeTransforms);
  else {
    const transformedContext =
      scopeTransforms.length === 0
        ? intrinsicContext
        : projectLayoutWithTransform(intrinsicContext, composeScopeTransform(scopeTransforms));
    finitePoint = evaluateAnchorReference(transformedContext, point);
  }
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

  const selfPoint = evaluateTransformedSelfPoint(
    (!Array.isArray(child.position) ? child.position?.selfAnchor : undefined) ?? 'center',
    intrinsicContext,
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
 * 在子树执行前解析不依赖自身包络的变换，冻结当前引用结果
 * @description 使用包络锚点作为旋转或缩放中心时，延后至子布局完成后计算
 */
const lowerPreliminaryScopeTransforms = (
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

/** 在子树执行前冻结 Scope 放置引用与不依赖包络的变换 */
export const prepareScopePlacement = (
  input: InputScopeCompile,
  context: Pick<ScopeCompileContext, 'positionContext' | 'irPath' | 'onWarn'>,
): ScopePlacementPreparation => ({
  positionTarget: evaluateScopePositionTarget(input, context),
  preliminaryTransforms: lowerPreliminaryScopeTransforms(input, context),
});
