import type { CanonicalPathStep } from '../../../../resolve';
import {
  isAtPositionLike,
  isBetweenPositionLike,
  isNodeTargetLike,
  isOffsetPositionLike,
  isPolarPositionLike,
} from '../../../../shared';

/** 具有普通目标点、可作为后续 step 前驱的 path step */
export type StrokeTargetStep = Exclude<
  CanonicalPathStep,
  | { kind: 'cycle' }
  | { kind: 'arc' }
  | { kind: 'circlePath' }
  | { kind: 'ellipsePath' }
  | { kind: 'rectangle' }
  | { kind: 'smooth' }
>;

/** 判断 step 是否具有普通 `to` 目标 */
export const isStrokeTargetStep = (canon: CanonicalPathStep): canon is StrokeTargetStep =>
  canon.kind !== 'cycle' &&
  canon.kind !== 'arc' &&
  canon.kind !== 'circlePath' &&
  canon.kind !== 'ellipsePath' &&
  canon.kind !== 'rectangle' &&
  canon.kind !== 'smooth';

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
