import type { RuntimeIdentity } from '@retikz/runtime';

/** Core document Snapshot 的固定 owner key */
export const CORE_SOURCE_KEY = '@retikz/core/document' as const;

/** 新增稳定实体 */
export type CoreAddChange = Readonly<{
  /** 新增稳定实体 */
  kind: 'add';
  /** 新实体 identity */
  identity: RuntimeIdentity;
  /** 更新后父级的身份 */
  parent: RuntimeIdentity;
  /** next 后继 sibling */
  before?: RuntimeIdentity;
}>;

/** 更新稳定实体 */
export type CoreUpdateChange = Readonly<{
  /** 更新稳定实体 */
  kind: 'update';
  /** 被更新实体 identity */
  identity: RuntimeIdentity;
}>;

/** 移除稳定实体 */
export type CoreRemoveChange = Readonly<{
  /** 移除稳定实体 */
  kind: 'remove';
  /** 被移除实体 identity */
  identity: RuntimeIdentity;
}>;

/** 移动稳定实体 */
export type CoreMoveChange = Readonly<{
  /** 移动稳定实体 */
  kind: 'move';
  /** 被移动实体 identity */
  identity: RuntimeIdentity;
  /** 更新后父级的身份 */
  parent: RuntimeIdentity;
  /** next 后继 sibling */
  before?: RuntimeIdentity;
}>;

/** Core Snapshot change hint，不携带局部 IR value */
export type CoreChange = CoreAddChange | CoreUpdateChange | CoreRemoveChange | CoreMoveChange;
