import type { FoldStepViaValue, IRPosition, IRTarget } from '../../../schemas';
import type { Transform } from '../../../contract';
import type { PathTargetView } from '../../../resolve/path';

import { FoldStepVia } from '../../../schemas';
import { isNodeTargetLike, isRelativeAccumulateTargetLike, isRelativeTargetLike } from '../../../shared';
import { point } from '../../../shared/geometry';

/** 判断 target 是否为自动边界裁剪的节点引用 */
export const isAutoBoundaryTarget = (target: IRTarget): boolean =>
  isNodeTargetLike(target) && target.anchor === undefined && target.offset === undefined;

/** 判断 target 是否为相对路径简写 */
export const isRelativeTarget = (target: IRTarget): boolean =>
  isRelativeTargetLike(target) || isRelativeAccumulateTargetLike(target);

/** 使用 resolving phase 绑定的 target view 获取局部参考点 */
export const pointOfTarget = (
  target: IRTarget,
  targetView: PathTargetView,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition | null => targetView.pointOfTarget(target, scopeChain);

/** 使用 resolving phase 绑定的 target view 获取参考点 */
export const referenceOfTarget = (
  target: IRTarget,
  targetView: PathTargetView,
  scopeChain: ReadonlyArray<Transform>,
): IRPosition | null => targetView.referenceOfTarget(target, scopeChain);

/** 使用 toward 计算 resolving phase 绑定的 target 裁剪点 */
export const clipTarget = (
  target: IRTarget,
  toward: IRPosition,
  context: Readonly<{ targetView: PathTargetView; scopeChain: ReadonlyArray<Transform> }>,
): IRPosition | null => context.targetView.clipTarget(target, toward, context.scopeChain);

/** 根据 fold step 的方向计算正交折角点 */
export const foldCornersOf = (
  prev: IRPosition,
  curr: IRPosition,
  via: FoldStepViaValue,
  fraction = 0.5,
): Array<IRPosition> => {
  if (via === FoldStepVia.HorizontalThenVertical) return [[curr[0], prev[1]]];
  if (via === FoldStepVia.VerticalThenHorizontal) return [[prev[0], curr[1]]];
  if (via === FoldStepVia.HorizontalVerticalHorizontal) {
    const x = prev[0] + (curr[0] - prev[0]) * fraction;
    return [
      [x, prev[1]],
      [x, curr[1]],
    ];
  }
  const y = prev[1] + (curr[1] - prev[1]) * fraction;
  return [
    [prev[0], y],
    [curr[0], y],
  ];
};

/** 判断两个已解析坐标是否逐分量相等 */
export const samePoint = (a: IRPosition | null, b: IRPosition | null): boolean => !!a && !!b && point.equal(a, b);
