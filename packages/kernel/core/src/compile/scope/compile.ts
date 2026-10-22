import type { Transform } from '../../contract';
import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { createLayoutProbeRecoverableError } from '../../resolve/diagnostics';
import type { PositionTargetResolveContext } from '../../resolve/position';
import { resolvePositionTargetWorld } from '../../resolve/position';
import type { IRScope, IRPosition, IRScopePositionTarget, IRScopeSelfPoint, IRTransform } from '../../schemas';
import { ScopeBoundingShape } from '../../schemas';
import type { CompileEnvironment } from '../environment';
import type { NodeLayout } from '../node';
import { createScopeCircleLayout, createScopeRectangleLayout } from '../node';
import { transformWarnCode } from '../orchestration';
import { resolveAnchorRefUncached } from '../reference';
import { applyTransformChain, composeScopeTransform, projectLayoutWithTransform } from '../transform';
import type { CompileWarningInput } from '../warning';
import { collectScopeCornerPoints, computeScopeBoundingBox, lowerScopeTransforms } from './layout';

/** Scope 自身几何声明，不包含子树 */
export type ScopeCompileInput = Omit<IRScope, 'children'>;

/** Scope 单次几何计算环境 */
export type ScopeGeometryContext = Readonly<{
  /** 当前位置读取能力 */
  positionContext: PositionTargetResolveContext;
  /** 当前诊断位置 */
  irPath: string;
  /** 当前诊断接收器 */
  onWarn: (warning: CompileWarningInput) => void;
}>;
/** 拒绝非 finite 的 Scope position 中间结果 */
const assertFiniteScopePoint = (point: IRPosition, label: string): IRPosition => {
  if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `${label} must resolve to a finite point`);
  }

  return point;
};

/**
 * 在 children 编译前冻结 Scope position target
 * @description 只允许父 frame 显式坐标或此前已完成的 namespace entry，避免 descendant / self / placeholder cycle
 */
export const resolveScopePositionTarget = (
  child: ScopeCompileInput,
  context: ScopeGeometryContext,
): IRPosition | undefined => {
  const target: IRScopePositionTarget | undefined = Array.isArray(child.position) ? undefined : child.position?.target;
  if (target === undefined) return undefined;
  if (Array.isArray(target)) {
    return assertFiniteScopePoint([target[0], target[1]], 'scope position target');
  }

  const scopeIrPath = context.irPath;
  if (target.id === child.id) {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve scope position target '${target.id}' at ${scopeIrPath}: self target is not allowed`,
    );
  }

  const positionContext = context.positionContext;
  const reference = positionContext.lookupReference(target.id);
  if (reference === undefined || reference.state !== 'resolved') {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve scope position target '${target.id}' at ${scopeIrPath}: target must be defined and fully resolved before this Scope`,
    );
  }

  const resolution = resolvePositionTargetWorld(target, positionContext);
  if (resolution.referencePoint === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve scope position target '${target.id}' at ${scopeIrPath}`,
    );
  }

  return assertFiniteScopePoint(positionContext.toLocal(resolution.referencePoint), 'scope position target');
};

/** 从当前 Scope 的固有 child layouts 创建 rectangle / circle synthetic envelope */
export const createIntrinsicScopeLayout = (
  child: ScopeCompileInput,
  scopeLayouts: ReadonlyArray<NodeLayout>,
  environment: Pick<CompileEnvironment, 'shapes' | 'boundaries'>,
): NodeLayout => {
  const id = child.id ?? '__anonymous_scope__';
  return child.boundingShape === ScopeBoundingShape.Circle
    ? createScopeCircleLayout(
        { id, cornerPoints: collectScopeCornerPoints(scopeLayouts), fallbackOrigin: [0, 0] },
        { shapes: environment.shapes, boundaries: environment.boundaries },
      )
    : createScopeRectangleLayout(
        { id, bbox: computeScopeBoundingBox(scopeLayouts), fallbackOrigin: [0, 0] },
        { shapes: environment.shapes, boundaries: environment.boundaries },
      );
};

/** anchor position self point：anchor 在 transformed envelope 上解析；origin / 显式点先按 own chain 投影 */
const resolveTransformedSelfPoint = (
  point: IRScopeSelfPoint,
  transformedLayout: NodeLayout,
  scopeTransforms: ReadonlyArray<Transform>,
): IRPosition => {
  if (typeof point === 'string') {
    if (point !== 'origin') {
      return assertFiniteScopePoint(resolveAnchorRefUncached(transformedLayout, point), 'scope position selfAnchor');
    }

    return assertFiniteScopePoint(applyTransformChain([0, 0], scopeTransforms), 'scope position selfAnchor');
  }

  if (Array.isArray(point)) {
    return assertFiniteScopePoint(
      applyTransformChain([point[0], point[1]], scopeTransforms),
      'scope position selfAnchor',
    );
  }

  return assertFiniteScopePoint(resolveAnchorRefUncached(transformedLayout, point), 'scope position selfAnchor');
};

/** children intrinsic layout 完成后解析 pivot，并生成最终 own chain */
export const resolveFinalScopeTransforms = (
  child: ScopeCompileInput,
  context: ScopeGeometryContext,
  intrinsicLayout: NodeLayout,
  positionTarget: IRPosition | undefined,
  preliminaryTransforms: Array<Transform> | undefined,
): Array<Transform> => {
  const scopeIrPath = context.irPath;
  let failedTransform: IRTransform | undefined;
  const loweredOwn =
    preliminaryTransforms ??
    lowerScopeTransforms(child.transforms ?? [], {
      positionContext: context.positionContext,
      intrinsicLayout,
      onUnresolved: transform => {
        failedTransform = transform;
      },
    });
  if (loweredOwn === null) {
    context.onWarn({
      code: transformWarnCode(failedTransform),
      message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
      path: `${scopeIrPath}.transforms`,
    });
  }

  const scopeTransforms = loweredOwn ?? [];
  if (Array.isArray(child.position)) {
    if (preliminaryTransforms !== undefined) return scopeTransforms;
    const [x, y] = child.position;
    return x === 0 && y === 0 ? scopeTransforms : [{ kind: 'translate', x, y }, ...scopeTransforms];
  }
  if (positionTarget === undefined) return scopeTransforms;

  const transformedLayout =
    scopeTransforms.length === 0
      ? intrinsicLayout
      : projectLayoutWithTransform(intrinsicLayout, composeScopeTransform(scopeTransforms));
  const selfPoint = resolveTransformedSelfPoint(
    (!Array.isArray(child.position) ? child.position?.selfAnchor : undefined) ?? 'center',
    transformedLayout,
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
export const resolvePreliminaryScopeTransforms = (
  child: ScopeCompileInput,
  context: ScopeGeometryContext,
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
    code: transformWarnCode(failedTransform),
    message: `Cannot resolve one of scope.transforms; referent (at.of / offset.of / polar.origin / between endpoints) is undefined or defined later in the IR`,
    path: `${context.irPath}.transforms`,
  });

  return Array.isArray(child.position) && (child.position[0] !== 0 || child.position[1] !== 0)
    ? [{ kind: 'translate', x: child.position[0], y: child.position[1] }]
    : [];
};
