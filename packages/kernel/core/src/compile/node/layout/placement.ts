import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';
import type { CanonicalNode, CanonicalPosition } from '../../../resolve';
import type { IRAnchorPosition, IRPosition } from '../../../schemas';
import { CenterAnchor } from '../../../shared';
import { evaluateAnchorReference, projectLayoutWithTransform } from '../../boundary';
import type { BoundaryState } from '../../boundary';
import type { PositionTargetEvaluateContext } from '../../reference';
import { evaluatePositionTargetWorld } from '../../reference';
import type { ComposedScopeTransform } from '../../shared';
import { inverseScopeTransform } from '../../shared';
import type { CompiledNodeLayout } from '../types';

/** 判断 Node.position 是否为锚点对锚点定位 */
export const isAnchorPosition = (
  position: CanonicalPosition | Required<IRAnchorPosition>,
): position is Required<IRAnchorPosition> => !Array.isArray(position) && 'kind' in position;

/** 把全局位移反投影为当前 Scope 的局部位移 */
const localDeltaOf = (
  deltaGlobal: IRPosition,
  globalOrigin: IRPosition,
  transform: ComposedScopeTransform,
): IRPosition => {
  if (transform.chain.length === 0) return deltaGlobal;
  if (transform.inverse === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      'Cannot resolve anchor position through a Scope transform with a zero scale axis',
    );
  }

  const before = inverseScopeTransform(globalOrigin, transform);
  const after = inverseScopeTransform([globalOrigin[0] + deltaGlobal[0], globalOrigin[1] + deltaGlobal[1]], transform);

  return [after[0] - before[0], after[1] - before[1]];
};

/** 根据 target 与 self anchor 平移完整 provisional layout */
export const placeAnchorPositionedLayout = (
  canon: CanonicalNode,
  position: IRAnchorPosition,
  provisional: CompiledNodeLayout,
  positionContext: PositionTargetEvaluateContext,
  transform: ComposedScopeTransform,
  boundaryState: BoundaryState,
): CompiledNodeLayout => {
  if (canon.id === position.target.id || canon.aliasIds.includes(position.target.id)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Node anchor position cannot reference itself ('${canon.id}')`,
    );
  }

  const reference = positionContext.lookupReference(position.target.id, 'position');
  if (reference === undefined) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; it is undefined or defined later in the IR`,
    );
  }

  if (reference.state === 'scope-placeholder') {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; the referenced Scope is still being laid out`,
    );
  }

  const target = evaluatePositionTargetWorld(position.target, positionContext);
  if (target.referencePoint === null) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Cannot resolve anchor position target '${position.target.id}'; it is undefined or defined later in the IR`,
    );
  }

  const projected = transform.chain.length === 0 ? provisional : projectLayoutWithTransform(provisional, transform);
  const selfPoint = evaluateAnchorReference(
    projected,
    position.selfAnchor ?? CenterAnchor.Center,
    undefined,
    canon.boundary,
    boundaryState,
  );
  const deltaGlobal: IRPosition = [target.referencePoint[0] - selfPoint[0], target.referencePoint[1] - selfPoint[1]];
  const deltaLocal = localDeltaOf(deltaGlobal, [projected.geometry.rect.x, projected.geometry.rect.y], transform);

  return {
    ...provisional,
    geometry: {
      ...provisional.geometry,
      rect: {
        ...provisional.geometry.rect,
        x: provisional.geometry.rect.x + deltaLocal[0],
        y: provisional.geometry.rect.y + deltaLocal[1],
      },
      contentCenter: [
        provisional.geometry.contentCenter[0] + deltaLocal[0],
        provisional.geometry.contentCenter[1] + deltaLocal[1],
      ],
    },
  };
};
