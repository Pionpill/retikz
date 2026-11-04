import {
  isAtPositionLike,
  isBetweenPositionLike,
  isNodeTargetLike,
  isOffsetPositionLike,
  isPolarPositionLike,
} from '../../../shared';

/** 从位置引用中提取诊断用的节点 id，不查询节点是否存在 */
const nodeIdFromPositionReferent = (reference: unknown): string | undefined =>
  typeof reference === 'string' ? reference : nodeIdFromResolvableTarget(reference);

/** 从目标或位置配置中提取一个节点 id，用于引用未找到时的警告 */
export const nodeIdFromResolvableTarget = (target: unknown): string | undefined => {
  if (isNodeTargetLike(target)) return target.id;
  if (isBetweenPositionLike(target)) {
    return nodeIdFromResolvableTarget(target.between[0]) ?? nodeIdFromResolvableTarget(target.between[1]);
  }

  if (isOffsetPositionLike(target) || isAtPositionLike(target)) return nodeIdFromPositionReferent(target.of);
  if (isPolarPositionLike(target)) return nodeIdFromPositionReferent(target.origin);

  return undefined;
};
